import type { UgcParticipationStatus, UgcSubmissionStatus } from "@/config/ugc";
import type { OrderStage } from "@/lib/order-stage";
import type { WorkspaceStage } from "./creator-workspace";

/**
 * UGC work on the order card's four steps (D605). Hired is "accepted";
 * hired with no video, or with a change asked, is "in work"; a sent video
 * is "on review"; an accepted or winning one is "done". A response or an
 * offer waits before the line; a refusal of either side is off it.
 */
export function participationStage(row: {
  status: UgcParticipationStatus;
  submission: { status: UgcSubmissionStatus } | null;
}): OrderStage {
  if (row.status === "applied" || row.status === "offered") {
    return { step: null, tone: "waiting" };
  }
  if (row.status !== "hired") return { step: null, tone: "closed" };
  switch (row.submission?.status) {
    case undefined:
    case "changes_requested":
      return { step: 1, tone: "work" };
    case "submitted":
      return { step: 2, tone: "review" };
    case "accepted":
    case "winner":
      return { step: 3, tone: "done" };
    case "rejected":
      return { step: null, tone: "closed" };
  }
}

const WORKSPACE: Record<WorkspaceStage, OrderStage> = {
  offer: { step: null, tone: "waiting" },
  applied: { step: null, tone: "waiting" },
  submit: { step: 1, tone: "work" },
  changes: { step: 1, tone: "work" },
  overdue: { step: 1, tone: "work" },
  review: { step: 2, tone: "review" },
  payout_wait: { step: 3, tone: "done" },
  paid: { step: 3, tone: "done" },
  rejected: { step: null, tone: "closed" },
  closed: { step: null, tone: "closed" },
};

/** The creator's own view of the same work (TZ 48 §7). */
export function workspaceOrderStage(stage: WorkspaceStage): OrderStage {
  return WORKSPACE[stage];
}
