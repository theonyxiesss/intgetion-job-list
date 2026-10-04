/**
 * matching_jobs IO (6B, D161). The loop and retry rules live in
 * service/queue-rules.ts.
 */
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { matchingJobs } from "@/db/schema";
import type { ClaimedTask, QueueStore } from "../service/queue-rules";
import { QUEUE_LOCK_MS, QUEUE_MAX_ATTEMPTS } from "../service/queue-rules";

const DONE_RETENTION_DAYS = 7;

/** One pending task per job; a repeat publish while it waits adds nothing. */
export async function enqueueJob(jobId: string): Promise<void> {
  await getDb().execute(sql`
    insert into public.matching_jobs (job_id)
    values (${jobId})
    on conflict (job_id) where status = 'pending' do nothing
  `);
}

export async function claimTask(now: Date): Promise<ClaimedTask | null> {
  const lockedUntil = new Date(now.getTime() + QUEUE_LOCK_MS).toISOString();
  const at = now.toISOString();
  const rows = await getDb().execute<{
    id: string;
    job_id: string;
    attempts: number;
  }>(sql`
    update public.matching_jobs m
    set status = 'running',
        attempts = m.attempts + 1,
        locked_until = ${lockedUntil}::timestamptz,
        updated_at = now()
    where m.id = (
      select id from public.matching_jobs
      where attempts < ${QUEUE_MAX_ATTEMPTS}
        and (
          (status = 'pending' and run_after <= ${at}::timestamptz)
          or (status = 'running' and locked_until < ${at}::timestamptz)
        )
      order by run_after
      limit 1
      for update skip locked
    )
    returning m.id, m.job_id, m.attempts
  `);
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, jobId: row.job_id, attempts: row.attempts };
}

async function finish(
  id: string,
  set: Partial<typeof matchingJobs.$inferInsert>,
): Promise<void> {
  await getDb()
    .update(matchingJobs)
    .set({ ...set, lockedUntil: null, updatedAt: sql`now()` })
    .where(eq(matchingJobs.id, id));
}

export const queueStore: QueueStore = {
  claim: claimTask,
  async complete(id, result) {
    await finish(id, {
      status: "done",
      considered: result.considered,
      written: result.written,
      error: null,
    });
  },
  async retry(id, runAfter, error) {
    // A newer publish may have queued the same job meanwhile: that pending
    // row covers this retry, and a second pending row would break the index.
    await getDb().execute(sql`
      update public.matching_jobs m
      set status = case when exists (
            select 1 from public.matching_jobs p
            where p.job_id = m.job_id and p.status = 'pending' and p.id <> m.id
          ) then 'done' else 'pending' end,
          run_after = ${runAfter.toISOString()}::timestamptz,
          error = ${error},
          locked_until = null,
          updated_at = now()
      where m.id = ${id}
    `);
  },
  async fail(id, error) {
    await finish(id, { status: "failed", error });
  },
};

/** Finished rows are kept a week for the admin and then dropped. */
export async function deleteFinishedTasks(now: Date): Promise<number> {
  const cutoff = new Date(
    now.getTime() - DONE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const rows = await getDb().execute<{ id: string }>(sql`
    delete from public.matching_jobs
    where status in ('done', 'failed') and updated_at < ${cutoff}::timestamptz
    returning id
  `);
  return rows.length;
}
