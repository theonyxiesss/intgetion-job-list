import type { UgcCampaignStatus } from "@/config/ugc";

/**
 * Where a brief stands, for the step track on the page and for Spoki's
 * summary (D464). Read only: it never moves a status.
 */

export const UGC_STEPS = [
  "brief",
  "review",
  "responses",
  "hire",
  "videos",
  "decision",
] as const;
export type UgcStep = (typeof UGC_STEPS)[number];

export type UgcCounts = {
  applied: number;
  offered: number;
  hired: number;
  /** Videos handed in and waiting for the company's decision. */
  waiting: number;
  accepted: number;
  winners: number;
};

export type UgcProgress = {
  /** The step the brief is on now; `done` once closed. */
  step: UgcStep | "done" | "rejected";
  /** What the company should do next; null when it only waits. */
  next: "hire" | "decide" | "remind" | null;
  counts: UgcCounts;
};

export function emptyCounts(): UgcCounts {
  return {
    applied: 0,
    offered: 0,
    hired: 0,
    waiting: 0,
    accepted: 0,
    winners: 0,
  };
}

/** Counts from participation and submission statuses of one brief. */
export function countParticipants(
  invites: readonly { status: string }[],
  submissions: readonly { status: string }[],
): UgcCounts {
  const counts = emptyCounts();
  for (const invite of invites) {
    if (invite.status === "applied") counts.applied += 1;
    if (invite.status === "offered") counts.offered += 1;
    if (invite.status === "hired") counts.hired += 1;
  }
  for (const submission of submissions) {
    if (submission.status === "submitted") counts.waiting += 1;
    if (submission.status === "accepted") counts.accepted += 1;
    if (submission.status === "winner") counts.winners += 1;
  }
  return counts;
}

export function campaignProgress(
  status: UgcCampaignStatus,
  counts: UgcCounts,
): UgcProgress {
  if (status === "draft") return { step: "brief", next: null, counts };
  if (status === "pending_review") {
    return { step: "review", next: null, counts };
  }
  if (status === "rejected") return { step: "rejected", next: null, counts };
  if (status === "closed") return { step: "done", next: null, counts };
  if (counts.waiting > 0) return { step: "decision", next: "decide", counts };
  if (counts.hired > 0) {
    const decided = counts.accepted + counts.winners;
    return decided >= counts.hired
      ? { step: "decision", next: null, counts }
      : { step: "videos", next: "remind", counts };
  }
  if (counts.applied > 0) return { step: "hire", next: "hire", counts };
  if (counts.offered > 0) return { step: "hire", next: null, counts };
  return { step: "responses", next: null, counts };
}

/** Index of the current step on the track; past steps are done. */
export function stepIndex(step: UgcProgress["step"]): number {
  if (step === "done") return UGC_STEPS.length;
  if (step === "rejected") return UGC_STEPS.indexOf("review");
  return UGC_STEPS.indexOf(step);
}
