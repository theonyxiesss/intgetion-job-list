/**
 * Recompute queue for published jobs (10.1, D161): the batch loop and the
 * retry rules. Pure: SQL comes in through `QueueStore`, so the claim and
 * retry logic is testable without a database.
 */

export const QUEUE_MAX_ATTEMPTS = 5;
/** A running task whose worker died is claimable again after this. */
export const QUEUE_LOCK_MS = 2 * 60 * 1000;
/** One cron call stops claiming after this (Vercel function limit 60 s). */
export const QUEUE_BUDGET_MS = 50 * 1000;

export interface ClaimedTask {
  id: string;
  jobId: string;
  /** attempts including this one */
  attempts: number;
}

export interface QueueStore {
  /** Claims one due task (FOR UPDATE SKIP LOCKED) or returns null. */
  claim(now: Date): Promise<ClaimedTask | null>;
  complete(
    id: string,
    result: { considered: number; written: number },
  ): Promise<void>;
  retry(id: string, runAfter: Date, error: string): Promise<void>;
  fail(id: string, error: string): Promise<void>;
}

export interface QueueRunResult {
  claimed: number;
  done: number;
  retried: number;
  failed: number;
}

/** 1, 2, 4, 8 minutes after the 1st…4th failure. */
export function retryDelayMs(attempts: number): number {
  return 60 * 1000 * 2 ** Math.max(0, attempts - 1);
}

export function failureOutcome(
  attempts: number,
  now: Date,
): { status: "failed" } | { status: "pending"; runAfter: Date } {
  if (attempts >= QUEUE_MAX_ATTEMPTS) return { status: "failed" };
  return {
    status: "pending",
    runAfter: new Date(now.getTime() + retryDelayMs(attempts)),
  };
}

function errorText(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.slice(0, 500);
}

/**
 * Claims and runs one task at a time until the queue is empty or the budget
 * is spent, so two parallel crons share the work instead of doubling it.
 */
export async function runQueue(input: {
  store: QueueStore;
  compute: (jobId: string) => Promise<{ considered: number; written: number }>;
  clock?: () => Date;
  budgetMs?: number;
}): Promise<QueueRunResult> {
  const clock = input.clock ?? (() => new Date());
  const started = clock().getTime();
  const budget = input.budgetMs ?? QUEUE_BUDGET_MS;
  const result: QueueRunResult = { claimed: 0, done: 0, retried: 0, failed: 0 };
  while (clock().getTime() - started < budget) {
    const task = await input.store.claim(clock());
    if (!task) break;
    result.claimed += 1;
    try {
      const outcome = await input.compute(task.jobId);
      await input.store.complete(task.id, outcome);
      result.done += 1;
    } catch (error) {
      const next = failureOutcome(task.attempts, clock());
      if (next.status === "failed") {
        await input.store.fail(task.id, errorText(error));
        result.failed += 1;
      } else {
        await input.store.retry(task.id, next.runAfter, errorText(error));
        result.retried += 1;
      }
    }
  }
  return result;
}
