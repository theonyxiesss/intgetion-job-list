import type {
  UgcCampaignStatus,
  UgcParticipationStatus,
  UgcSubmissionStatus,
} from "@/config/ugc";

/**
 * The creator's workspace (TZ 48 §7, U1, D572): what needs the creator now,
 * the deadlines and the money, built from data that already exists. Pure: no
 * database, no route. Money lines are obligations and server-confirmed
 * transfers, not a balance that can be withdrawn.
 */

export type WorkspaceStage =
  | "offer"
  | "applied"
  | "submit"
  | "changes"
  | "overdue"
  | "review"
  | "payout_wait"
  | "paid"
  | "rejected"
  | "closed";

export type WorkspaceSection = "offers" | "in_progress" | "on_review" | "done";

/** What the creator can do next; `none` means the creator waits. */
export type WorkspaceAction = "accept" | "submit" | "send_changes" | "none";

export type WorkspaceInput = {
  today: string;
  rows: readonly {
    invite: {
      id: string;
      status: UgcParticipationStatus;
      bountyMinor: bigint | null;
    };
    campaign: {
      id: string;
      status: UgcCampaignStatus;
      productName: string;
      deadline: string;
    };
    submission: { status: UgcSubmissionStatus } | null;
    payout: { status: "owed" | "paid"; amountMinor: bigint } | null;
  }[];
};

export type WorkspaceItem = {
  inviteId: string;
  campaignId: string;
  productName: string;
  stage: WorkspaceStage;
  section: WorkspaceSection;
  action: WorkspaceAction;
  /** The reward in minor units; null when the offer carries none yet. */
  rewardMinor: bigint | null;
  deadline: string;
  /** Whole days to the deadline; negative when it passed. */
  daysLeft: number;
};

export type WorkspaceMoney = {
  /** Accepted work: owed plus paid. */
  acceptedMinor: bigint;
  /** Accepted, the transfer is not confirmed yet. */
  owedMinor: bigint;
  /** Paid, confirmed by the server. */
  paidMinor: bigint;
};

export type CreatorWorkspace = {
  /** Items that need the creator now, the nearest deadline first. */
  now: WorkspaceItem[];
  sections: Record<WorkspaceSection, WorkspaceItem[]>;
  money: WorkspaceMoney;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(today: string, deadline: string): number {
  const from = Date.parse(`${today}T00:00:00.000Z`);
  const to = Date.parse(`${deadline}T00:00:00.000Z`);
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / DAY_MS);
}

type Classified = Pick<WorkspaceItem, "stage" | "section" | "action">;

function classify(
  row: WorkspaceInput["rows"][number],
  working: boolean,
): Classified {
  const { invite, submission, payout } = row;
  if (invite.status === "applied") {
    return { stage: "applied", section: "offers", action: "none" };
  }
  if (invite.status === "offered") {
    return working
      ? { stage: "offer", section: "offers", action: "accept" }
      : { stage: "closed", section: "done", action: "none" };
  }
  if (invite.status !== "hired") {
    return { stage: "closed", section: "done", action: "none" };
  }
  if (!submission) {
    return working
      ? { stage: "submit", section: "in_progress", action: "submit" }
      : { stage: "overdue", section: "in_progress", action: "none" };
  }
  if (submission.status === "changes_requested") {
    return working
      ? { stage: "changes", section: "in_progress", action: "send_changes" }
      : { stage: "overdue", section: "in_progress", action: "none" };
  }
  if (submission.status === "submitted") {
    return { stage: "review", section: "on_review", action: "none" };
  }
  if (submission.status === "rejected") {
    return { stage: "rejected", section: "done", action: "none" };
  }
  // accepted or winner: the obligation exists; the transfer is its own axis.
  return payout?.status === "paid"
    ? { stage: "paid", section: "done", action: "none" }
    : { stage: "payout_wait", section: "done", action: "none" };
}

/** The workspace for one creator. Never mixes another creator's rows in. */
export function buildCreatorWorkspace(input: WorkspaceInput): CreatorWorkspace {
  const items: WorkspaceItem[] = input.rows.map((row) => {
    const working =
      row.campaign.status === "open" && row.campaign.deadline >= input.today;
    const classified = classify(row, working);
    return {
      inviteId: row.invite.id,
      campaignId: row.campaign.id,
      productName: row.campaign.productName,
      ...classified,
      rewardMinor: row.payout?.amountMinor ?? row.invite.bountyMinor,
      deadline: row.campaign.deadline,
      daysLeft: daysBetween(input.today, row.campaign.deadline),
    };
  });

  const byDeadline = (a: WorkspaceItem, b: WorkspaceItem) =>
    a.deadline.localeCompare(b.deadline) ||
    a.inviteId.localeCompare(b.inviteId);
  const sections: CreatorWorkspace["sections"] = {
    offers: [],
    in_progress: [],
    on_review: [],
    done: [],
  };
  for (const item of items) sections[item.section].push(item);
  for (const list of Object.values(sections)) list.sort(byDeadline);
  // The done list reads newest first by its own sort in the page; keep stable here.

  let owedMinor = BigInt(0);
  let paidMinor = BigInt(0);
  for (const row of input.rows) {
    if (!row.payout) continue;
    if (row.payout.status === "owed") owedMinor += row.payout.amountMinor;
    else paidMinor += row.payout.amountMinor;
  }

  return {
    now: items.filter((item) => item.action !== "none").sort(byDeadline),
    sections,
    money: {
      acceptedMinor: owedMinor + paidMinor,
      owedMinor,
      paidMinor,
    },
  };
}
