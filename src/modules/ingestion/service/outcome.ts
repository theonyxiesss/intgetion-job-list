import type { ImportedJobStatus } from "@/modules/jobs/service";
import type { RunCounters } from "../repo/import-repo";

/** What one incoming record does to the catalog (13.3, 13.4). */
export type Outcome = {
  status: ImportedJobStatus;
  reason:
    | "scam_pattern_rejected"
    | "duplicate_of_internal"
    | "source_expired"
    | "seen_again"
    | "merged_duplicate"
    | "imported_from_fixture";
  counter: keyof Omit<RunCounters, "fetched">;
  queueForReview: boolean;
};

export function decideOutcome(input: {
  scam: boolean;
  expired: boolean;
  alreadyLinked: boolean;
  duplicate: "internal" | "imported" | null;
}): Outcome {
  if (input.scam) {
    return {
      status: "removed",
      reason: "scam_pattern_rejected",
      counter: "rejected",
      queueForReview: true,
    };
  }
  if (input.duplicate === "internal") {
    return {
      status: "removed",
      reason: "duplicate_of_internal",
      counter: "rejected",
      queueForReview: false,
    };
  }
  if (input.expired) {
    return {
      status: "expired",
      reason: "source_expired",
      counter: "expired",
      queueForReview: false,
    };
  }
  if (input.alreadyLinked) {
    return {
      status: "published",
      reason: "seen_again",
      counter: "updated",
      queueForReview: false,
    };
  }
  if (input.duplicate === "imported") {
    return {
      status: "published",
      reason: "merged_duplicate",
      counter: "merged",
      queueForReview: false,
    };
  }
  return {
    status: "published",
    reason: "imported_from_fixture",
    counter: "created",
    queueForReview: false,
  };
}

/**
 * 13.4 «no record in the source two runs in a row». For the current source
 * the run in progress is the second one, so one finished run after the
 * row was last seen is enough; another source of a merged job must have
 * missed two finished runs of its own.
 */
export function isMissingEverywhere(
  rows: { currentSource: boolean; finishedRunsSinceSeen: number }[],
): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) =>
      row.currentSource
        ? row.finishedRunsSinceSeen >= 1
        : row.finishedRunsSinceSeen >= 2,
    )
  );
}
