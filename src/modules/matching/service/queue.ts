/**
 * 6B: recompute on publish (10.1, D161) and cache invalidation after
 * feedback. The queue replaces pg-boss (D25) for the MVP.
 */
import { logger } from "@/lib/logger";
import { clearUserResults } from "../repo/matching-repo";
import {
  deleteFinishedTasks,
  enqueueJob,
  queueStore,
} from "../repo/queue-repo";
import { computeMatchesForJob } from "./compute";
import { runQueue, type QueueRunResult } from "./queue-rules";

/**
 * Called where a job becomes published. A queue failure must not fail the
 * publish: the candidate's own request recomputes within 6 hours anyway.
 */
export async function enqueueMatchingForJob(jobId: string): Promise<void> {
  try {
    await enqueueJob(jobId);
  } catch (error) {
    logger.error({ jobId, err: error }, "matching enqueue failed");
  }
}

export async function runMatchingCron(
  options: { now?: Date; budgetMs?: number } = {},
): Promise<QueueRunResult & { purged: number }> {
  const result = await runQueue({
    store: queueStore,
    compute: (jobId) => computeMatchesForJob(jobId),
    budgetMs: options.budgetMs,
  });
  const purged = await deleteFinishedTasks(options.now ?? new Date());
  return { ...result, purged };
}

/** The next GET /api/matches recomputes with the new feedback. */
export async function invalidateUserMatches(userId: string): Promise<void> {
  await clearUserResults(userId);
}
