/** Feedback reads the /matches feed needs; the repo stays module-private. */
import {
  readExcludedSets,
  readHiddenJobs,
  readHideReasonCounts,
  type HiddenJobRow,
} from "../repo/matching-repo";

export function readExcludedSetsForUser(userId: string) {
  return readExcludedSets(userId);
}

export function readHiddenJobsForUser(
  userId: string,
  limit: number,
): Promise<HiddenJobRow[]> {
  return readHiddenJobs(userId, limit);
}

export function readHideReasonCountsForUser(userId: string, now: Date) {
  return readHideReasonCounts(userId, now);
}
