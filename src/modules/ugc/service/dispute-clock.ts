import { UGC_LIMITS as L } from "@/config/ugc";
import { addBusinessDays } from "./review-clock";

/**
 * Support's response time on a problem (D590): three business days from the
 * moment a party raised it. Support answers by taking the problem into review
 * or closing it; after that the clock is done. Business days are Monday to
 * Friday in UTC, as for the review clock (D574).
 */

/** When support must have answered a problem raised at `openedAt`. */
export function disputeDueAt(openedAt: Date): Date {
  return addBusinessDays(openedAt, L.disputeResponseBusinessDays);
}

/** A problem nobody from support has picked up by its due time. */
export function disputeOverdue(
  now: Date,
  dispute: { status: string; createdAt: Date },
): boolean {
  return dispute.status === "open" && now >= disputeDueAt(dispute.createdAt);
}
