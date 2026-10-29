import { unauthenticated } from "@/lib/http";
import {
  briefForReaders,
  db,
  forReader,
  listMyCampaignSummaries,
  moneyRecord,
  previewMatches,
  publicCreatorCard,
  readCampaign,
} from "./commands";
import { depositStatesFor, type DepositState } from "./escrow";
import { escrowOn } from "./escrow-gate";
import { campaignProgress, countParticipants } from "./progress";
import { ugcBudgetMinor } from "./pricing";
import type { Campaign, Invite, Submission } from "./records";
import type { UgcStore } from "./store";
import { campaignGroup, type CampaignGroup } from "./workspace-view";

type CompanyView = Extract<
  Awaited<ReturnType<typeof readCampaign>>,
  { role: "company" }
>;
type Summary = Awaited<ReturnType<typeof listMyCampaignSummaries>>[number];

export type WorkspaceCampaign = Summary & {
  brief: CompanyView["brief"];
  participants: CompanyView["participants"];
  deposit: DepositState;
};
export type WorkspaceParticipant = WorkspaceCampaign["participants"][number];
export type WorkspaceMatch = Awaited<ReturnType<typeof previewMatches>>[number];

/**
 * Every brief of the member's companies (or of one of them) with its
 * participants, videos and budget (D519). Read only. Since U2 (TZ 48) the
 * reads are batched: the number of database reads does not grow with the
 * number of briefs, creators or videos. The rows are the ones the brief
 * page shows to a member; an unknown or foreign company id gives nothing,
 * never another company's data.
 */
export async function companyWorkspace(
  userId: string | null,
  options: { companyId?: string } = {},
): Promise<WorkspaceCampaign[]> {
  const loaded = await loadSummaries(userId, options.companyId);
  return detailsFor(loaded, loaded.sorted);
}

export type DeskPage = {
  items: WorkspaceCampaign[];
  /** Briefs matching the filter, before paging. */
  total: number;
  /** Briefs of the selected company in each group, for the filter chips. */
  groups: Record<CampaignGroup, number>;
  page: number;
  pageSize: number;
};

export const DESK_PAGE_SIZE = 10;

/**
 * One page of the briefs list (U2, TZ 48 §4): filter by status group and a
 * search word; details only for the rows on the page.
 */
export async function companyDeskPage(
  userId: string | null,
  query: {
    companyId?: string;
    group?: CampaignGroup;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<DeskPage> {
  const loaded = await loadSummaries(userId, query.companyId);
  const groups: Record<CampaignGroup, number> = {
    active: 0,
    review: 0,
    closed: 0,
    all: loaded.sorted.length,
  };
  for (const row of loaded.sorted) groups[campaignGroup(row.status)] += 1;
  const group = query.group ?? "active";
  const word = (query.search ?? "").trim().toLowerCase();
  const matching = loaded.sorted.filter(
    (row) =>
      (group === "all" || campaignGroup(row.status) === group) &&
      (!word || row.productName.toLowerCase().includes(word)),
  );
  const pageSize = Math.min(Math.max(query.pageSize ?? DESK_PAGE_SIZE, 1), 50);
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.min(Math.max(query.page ?? 1, 1), pages);
  const slice = matching.slice((page - 1) * pageSize, page * pageSize);
  return {
    items: await detailsFor(loaded, slice),
    total: matching.length,
    groups,
    page,
    pageSize,
  };
}

type Loaded = {
  store: UgcStore;
  campaigns: Map<string, Campaign>;
  invitesBy: Map<string, Invite[]>;
  submissions: Submission[];
  sorted: Summary[];
};

/** Four reads for any number of briefs: briefs, invites, videos, budgets. */
async function loadSummaries(
  userId: string | null,
  companyId?: string,
): Promise<Loaded> {
  if (!userId) throw unauthenticated();
  const store = await db();
  const companies = await store.companiesFor(userId);
  const ids = companies
    .filter((row) => !companyId || row.id === companyId)
    .map((row) => row.id);
  const rows = await store.listByCompanies(ids);
  const campaignIds = rows.map((row) => row.id);
  const invites = await store.listInvitesForCampaigns(campaignIds);
  const submissions = await store.listSubmissions(invites.map((row) => row.id));
  const deposits = await store.confirmedDepositsMinor(campaignIds);
  const wallet = escrowOn();
  const invitesBy = new Map<string, Invite[]>();
  for (const invite of invites) {
    const list = invitesBy.get(invite.campaignId) ?? [];
    list.push(invite);
    invitesBy.set(invite.campaignId, list);
  }
  const submissionOf = new Map(submissions.map((row) => [row.inviteId, row]));
  const sorted = rows.map((row): Summary => {
    const own = invitesBy.get(row.id) ?? [];
    const ownSubmissions = own.flatMap((invite) => {
      const found = submissionOf.get(invite.id);
      return found ? [found] : [];
    });
    return {
      id: row.id,
      productName: row.productName,
      status: row.status,
      deadline: row.deadline,
      videosWanted: row.videosWanted,
      bountyMinor: row.bountyMinor.toString(),
      budgetMinor: ugcBudgetMinor(row.videosWanted, Number(row.bountyMinor)),
      progress: campaignProgress(
        row.status,
        countParticipants(own, ownSubmissions),
        {
          depositNeeded:
            wallet && row.status === "open" && !deposits.has(row.id),
        },
      ),
    };
  });
  // Live briefs first, then the ones in review, then closed; nearest deadline first.
  sorted.sort(
    (a, b) =>
      GROUP_ORDER[campaignGroup(a.status)] -
        GROUP_ORDER[campaignGroup(b.status)] ||
      a.deadline.localeCompare(b.deadline),
  );
  return {
    store,
    campaigns: new Map(rows.map((row) => [row.id, row])),
    invitesBy,
    submissions,
    sorted,
  };
}

/** People, payouts and budget state for some briefs: three reads in all. */
async function detailsFor(
  loaded: Loaded,
  summaries: readonly Summary[],
): Promise<WorkspaceCampaign[]> {
  if (summaries.length === 0) return [];
  const briefs = summaries.flatMap((row) => {
    const found = loaded.campaigns.get(row.id);
    return found ? [found] : [];
  });
  const invites = briefs.flatMap((row) => loaded.invitesBy.get(row.id) ?? []);
  const inviteIds = new Set(invites.map((row) => row.id));
  const submissions = loaded.submissions.filter((row) =>
    inviteIds.has(row.inviteId),
  );
  const [profiles, payouts, deposits] = await Promise.all([
    loaded.store.getProfiles([
      ...new Set(invites.map((row) => row.creatorUserId)),
    ]),
    loaded.store.listPayoutsBySubmissions(submissions.map((row) => row.id)),
    depositStatesFor(briefs),
  ]);
  const submissionOf = new Map(submissions.map((row) => [row.inviteId, row]));
  return summaries.flatMap((summary) => {
    const campaign = loaded.campaigns.get(summary.id);
    const deposit = deposits.get(summary.id);
    if (!campaign || !deposit) return [];
    return [
      {
        ...summary,
        brief: {
          ...briefForReaders(campaign),
          pitch: campaign.pitch,
          exampleUrls: campaign.exampleUrls,
        },
        participants: (loaded.invitesBy.get(campaign.id) ?? []).map(
          (invite) => {
            const submission = submissionOf.get(invite.id) ?? null;
            const profile = profiles.get(invite.creatorUserId);
            return {
              inviteId: invite.id,
              status: invite.status,
              bountyMinor: invite.bountyMinor?.toString() ?? null,
              rights: invite.rights,
              pitch: invite.pitch,
              reminders: invite.reminders,
              revisionUsed: invite.revisionUsed,
              creator: profile ? publicCreatorCard(profile) : null,
              submission: forReader(submission),
              payout: moneyRecord(
                submission ? (payouts.get(submission.id) ?? null) : null,
              ),
            };
          },
        ),
        deposit,
      },
    ];
  });
}

const GROUP_ORDER = { active: 0, review: 1, closed: 2, all: 3 } as const;

/**
 * Public cards of matching creators for each open brief, without people who
 * already take part (27.7). Same rule and same card as Spoki's preview.
 */
export async function workspaceMatches(
  userId: string | null,
  campaigns: readonly WorkspaceCampaign[],
  perCampaign = 6,
): Promise<{ campaign: WorkspaceCampaign; matches: WorkspaceMatch[] }[]> {
  if (!userId) throw unauthenticated();
  const out = [];
  for (const campaign of campaigns) {
    if (campaign.status !== "open") continue;
    const taken = new Set(
      campaign.participants.flatMap((row) =>
        row.creator ? [row.creator.userId] : [],
      ),
    );
    const matches = (await previewMatches(userId, campaign.id))
      .filter((card) => card.userId !== userId && !taken.has(card.userId))
      .slice(0, perCampaign);
    out.push({ campaign, matches });
  }
  return out;
}
