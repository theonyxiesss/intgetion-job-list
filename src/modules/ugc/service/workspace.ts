import { unauthenticated } from "@/lib/http";
import {
  listMyCampaignSummaries,
  previewMatches,
  readCampaign,
} from "./commands";
import { campaignDepositState } from "./escrow";
import { campaignGroup } from "./workspace-view";

type CompanyView = Extract<
  Awaited<ReturnType<typeof readCampaign>>,
  { role: "company" }
>;
type Summary = Awaited<ReturnType<typeof listMyCampaignSummaries>>[number];

export type WorkspaceCampaign = Summary & {
  brief: CompanyView["brief"];
  participants: CompanyView["participants"];
  deposit: Awaited<ReturnType<typeof campaignDepositState>>;
};
export type WorkspaceParticipant = WorkspaceCampaign["participants"][number];
export type WorkspaceMatch = Awaited<ReturnType<typeof previewMatches>>[number];

/**
 * Every brief of the member's companies with its participants, videos and
 * budget (D519). Read only, through the same member-checked reads the brief
 * page uses: no second way to see a campaign.
 */
export async function companyWorkspace(
  userId: string | null,
): Promise<WorkspaceCampaign[]> {
  if (!userId) throw unauthenticated();
  const summaries = await listMyCampaignSummaries(userId);
  const out: WorkspaceCampaign[] = [];
  for (const summary of summaries) {
    const [view, deposit] = await Promise.all([
      readCampaign(userId, summary.id),
      campaignDepositState(userId, summary.id),
    ]);
    if (view.role !== "company") continue;
    out.push({
      ...summary,
      brief: view.brief,
      participants: view.participants,
      deposit,
    });
  }
  // Live briefs first, then the ones in review, then closed; nearest deadline first.
  return out.sort(
    (a, b) =>
      GROUP_ORDER[campaignGroup(a.status)] -
        GROUP_ORDER[campaignGroup(b.status)] ||
      a.deadline.localeCompare(b.deadline),
  );
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
