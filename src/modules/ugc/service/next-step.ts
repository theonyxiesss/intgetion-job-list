import { readAccountWallet } from "@/modules/users/service";
import { HttpError } from "@/lib/http";
import { campaignForMember, db } from "./commands";
import { escrowOn } from "./escrow-gate";
import { committedMinor } from "./escrow-rules";
import type { Campaign, Invite, Payout, Submission } from "./records";
import type { UgcStore } from "./store";

/**
 * The one next step Spoki offers when a brief or an invite thread opens
 * (D467). Read only: a write still needs its confirmation card. No names,
 * notes or links of the other side are put into the step text.
 */

export type UgcNextStep =
  | { kind: "deposit"; key: string; campaignId: string }
  | { kind: "hire"; key: string; campaignId: string; creatorId: string }
  | { kind: "decide"; key: string; campaignId: string; inviteId: string }
  | { kind: "remind"; key: string; campaignId: string; inviteId: string }
  | { kind: "accept"; key: string; campaignId: string; inviteId: string }
  | { kind: "submit"; key: string; campaignId: string; inviteId: string }
  | { kind: "changes"; key: string; campaignId: string; inviteId: string }
  | { kind: "payout"; key: string; campaignId: string; inviteId: string };

export type CompanySide = {
  campaign: Pick<
    Campaign,
    "id" | "status" | "videosWanted" | "bountyMinor" | "deadline"
  >;
  today: string;
  /** Offers wait for a paid budget (D466). */
  escrow: boolean;
  depositMinor: bigint | null;
  /** Oldest first. */
  invites: readonly Pick<
    Invite,
    "id" | "status" | "creatorUserId" | "bountyMinor" | "reminders"
  >[];
  submissions: readonly Pick<Submission, "inviteId" | "status">[];
};

/** The company's next step on an open brief, or null when it only waits. */
export function companyNextStep(side: CompanySide): UgcNextStep | null {
  const { campaign } = side;
  if (campaign.status !== "open") return null;
  const id = campaign.id;
  const byInvite = new Map(side.submissions.map((row) => [row.inviteId, row]));
  const waiting = side.invites.find(
    (invite) => byInvite.get(invite.id)?.status === "submitted",
  );
  if (waiting) {
    return {
      kind: "decide",
      key: `decide:${waiting.id}`,
      campaignId: id,
      inviteId: waiting.id,
    };
  }
  const open = campaign.deadline >= side.today;
  const promised = side.invites.filter(
    (row) => row.status === "offered" || row.status === "hired",
  ).length;
  // No new offer goes out before the budget is in, so this comes first.
  if (side.escrow && side.depositMinor === null && open) {
    return { kind: "deposit", key: `deposit:${id}`, campaignId: id };
  }
  const applicant = side.invites.find((row) => row.status === "applied");
  const room =
    promised < campaign.videosWanted &&
    (!side.escrow ||
      (side.depositMinor !== null &&
        committedMinor(side.invites, campaign.bountyMinor) <=
          side.depositMinor));
  if (applicant && room && open) {
    return {
      kind: "hire",
      key: `hire:${applicant.creatorUserId}`,
      campaignId: id,
      creatorId: applicant.creatorUserId,
    };
  }
  const silent = side.invites.find(
    (row) =>
      row.reminders === 0 &&
      (row.status === "offered" ||
        (row.status === "hired" && !byInvite.has(row.id))),
  );
  if (silent) {
    return {
      kind: "remind",
      key: `remind:${silent.id}`,
      campaignId: id,
      inviteId: silent.id,
    };
  }
  return null;
}

export type CreatorSide = {
  campaign: Pick<Campaign, "id" | "status" | "deadline">;
  today: string;
  invite: Pick<Invite, "id" | "status">;
  submission: Pick<Submission, "status"> | null;
  payout: Pick<Payout, "status"> | null;
  /** The reward goes out from the campaign wallet (D466). */
  fromWallet: boolean;
  hasPayoutAddress: boolean;
};

/** The creator's next step on an invite, or null when it only waits. */
export function creatorNextStep(side: CreatorSide): UgcNextStep | null {
  const base = { campaignId: side.campaign.id, inviteId: side.invite.id };
  const working =
    side.campaign.status === "open" && side.campaign.deadline >= side.today;
  if (side.invite.status === "offered" && working) {
    return { kind: "accept", key: `accept:${side.invite.id}`, ...base };
  }
  if (side.invite.status !== "hired") return null;
  if (!side.submission) {
    return working
      ? { kind: "submit", key: `submit:${side.invite.id}`, ...base }
      : null;
  }
  if (side.submission.status === "changes_requested") {
    return working
      ? { kind: "changes", key: `changes:${side.invite.id}`, ...base }
      : null;
  }
  if (
    side.payout?.status === "owed" &&
    side.fromWallet &&
    !side.hasPayoutAddress
  ) {
    return { kind: "payout", key: `payout:${side.invite.id}`, ...base };
  }
  return null;
}

async function companyStep(store: UgcStore, campaign: Campaign) {
  const invites = await store.listInvites(campaign.id);
  return companyNextStep({
    campaign,
    today: store.now().toISOString().slice(0, 10),
    escrow: escrowOn(),
    depositMinor: await store.confirmedDepositMinor(campaign.id),
    invites: [...invites].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    ),
    submissions: await store.listSubmissions(invites.map((row) => row.id)),
  });
}

/**
 * The next step for whoever opens this thread: the company on a brief, the
 * creator on an invite. A stranger gets null, as a 404 would be.
 */
export async function ugcNextStep(
  userId: string | null,
  ids: { campaignId?: string; inviteId?: string },
): Promise<UgcNextStep | null> {
  if (!userId) return null;
  const store = await db();
  try {
    if (ids.campaignId) {
      const campaign = await campaignForMember(store, ids.campaignId, userId);
      return await companyStep(store, campaign);
    }
    if (ids.inviteId) {
      const invite = await store.getInvite(ids.inviteId);
      if (!invite || invite.creatorUserId !== userId) return null;
      const campaign = await store.getCampaign(invite.campaignId);
      if (!campaign) return null;
      const submission = await store.getSubmission(invite.id);
      const payout = submission
        ? await store.getPayoutBySubmission(submission.id)
        : null;
      const fromWallet =
        payout?.status === "owed" &&
        (await store.confirmedDepositMinor(campaign.id)) !== null;
      return creatorNextStep({
        campaign,
        today: store.now().toISOString().slice(0, 10),
        invite,
        submission,
        payout,
        fromWallet,
        hasPayoutAddress: fromWallet
          ? Boolean(await readAccountWallet(userId))
          : false,
      });
    }
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return null;
    throw error;
  }
  return null;
}
