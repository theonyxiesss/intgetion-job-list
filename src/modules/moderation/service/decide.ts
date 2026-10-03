/** What an admin decision on a queue item does to its entity (14.4, D82). */

export type QueueTarget =
  | { kind: "job"; source: "internal" | "imported"; status: string }
  | { kind: "company"; status: string }
  | { kind: "missing" };

export type QueueEffect =
  | "approve_job"
  | "reject_job"
  | "remove_job"
  | "republish_imported"
  | "reject_company"
  | "none";

export function planDecision(
  target: QueueTarget,
  decision: "approved" | "rejected",
): QueueEffect {
  if (target.kind === "missing") return "none";
  if (target.kind === "company") {
    // Approving a possible duplicate keeps the company as it is.
    return decision === "rejected" &&
      target.status !== "rejected" &&
      target.status !== "suspended"
      ? "reject_company"
      : "none";
  }
  if (target.source === "imported") {
    // Imports reach the queue as automatic scam rejections (D74).
    if (decision === "approved") {
      return target.status === "removed" ? "republish_imported" : "none";
    }
    return target.status === "removed" ? "none" : "remove_job";
  }
  if (target.status === "pending_moderation") {
    return decision === "approved" ? "approve_job" : "reject_job";
  }
  // Post-moderation of a live job: a rejection takes it down.
  if (decision === "rejected" && target.status !== "removed") {
    return "remove_job";
  }
  return "none";
}

/** SLA of 14.4: an item waiting longer than 24 h is overdue. */
export const QUEUE_SLA_MS = 24 * 60 * 60 * 1000;

export function isOverdue(createdAt: Date, now: Date): boolean {
  return now.getTime() - createdAt.getTime() > QUEUE_SLA_MS;
}
