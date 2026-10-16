import { UGC_ESCROW_LIVE } from "@/config/ugc";
import type { UgcSubmissionStatus } from "@/config/ugc";
import { HttpError } from "@/lib/http";
import { UGC_ERRORS } from "./rules";

/**
 * Campaign wallet rules (D465, D466). Pure: no network, no database. The
 * budget is paid in before any offer; offers never promise more than it.
 */

/** Offers need a paid budget only while the checkout itself is on. */
export function escrowRequired(checkoutOn: boolean): boolean {
  return UGC_ESCROW_LIVE && checkoutOn;
}

/** Rewards already promised (offered or hired) plus the next one. */
export function committedMinor(
  invites: readonly { status: string; bountyMinor: bigint | null }[],
  nextBountyMinor: bigint,
): bigint {
  let total = nextBountyMinor;
  for (const invite of invites) {
    if (
      (invite.status === "offered" || invite.status === "hired") &&
      invite.bountyMinor != null
    ) {
      total += invite.bountyMinor;
    }
  }
  return total;
}

/** An offer is refused without a paid budget or beyond it. */
export function assertBudgetRoom(input: {
  depositMinor: bigint | null;
  committedMinor: bigint;
}): void {
  if (input.depositMinor === null) {
    throw new HttpError(
      409,
      UGC_ERRORS.depositRequired,
      "Pay in the brief budget first",
    );
  }
  if (input.committedMinor > input.depositMinor) {
    throw new HttpError(
      409,
      UGC_ERRORS.budgetExceeded,
      "This offer goes over the paid budget",
    );
  }
}

/** What goes back to the company: the budget minus every recorded reward. */
export function refundableMinor(
  depositMinor: bigint,
  rewardsMinor: readonly bigint[],
): bigint {
  const spent = rewardsMinor.reduce((sum, value) => sum + value, BigInt(0));
  return depositMinor > spent ? depositMinor - spent : BigInt(0);
}

/**
 * The rest goes back only from a closed brief with no handed-in video left
 * to decide: that decision could still owe a reward. A video sent back for
 * changes cannot come again after closing, so it does not hold the rest.
 */
export function refundBlocked(
  campaignStatus: string,
  submissionStatuses: readonly UgcSubmissionStatus[],
): boolean {
  if (campaignStatus !== "closed") return true;
  return submissionStatuses.some((status) => status === "submitted");
}
