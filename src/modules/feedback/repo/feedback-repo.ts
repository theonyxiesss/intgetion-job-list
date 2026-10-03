/**
 * Database access for saved_jobs, user_job_feedback and reports (4B).
 * Reads of public job data go through the jobs module's service surface —
 * this repo touches only its own three tables.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { reports, savedJobs, userJobFeedback } from "@/db/schema";
import type { HiddenSets } from "../rules";

export async function isSaved(userId: string, jobId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ jobId: savedJobs.jobId })
    .from(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    .limit(1);
  return row !== undefined;
}

/** Idempotent insert; returns true when a new row appeared. */
export async function insertSavedJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  const rows = await getDb()
    .insert(savedJobs)
    .values({ userId, jobId })
    .onConflictDoNothing()
    .returning({ jobId: savedJobs.jobId });
  return rows.length > 0;
}

/** Idempotent delete; returns true when a row was removed. */
export async function deleteSavedJob(
  userId: string,
  jobId: string,
): Promise<boolean> {
  const rows = await getDb()
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    .returning({ jobId: savedJobs.jobId });
  return rows.length > 0;
}

export async function listSavedJobIds(
  userId: string,
  limit = 100,
): Promise<{ jobId: string; createdAt: Date }[]> {
  return getDb()
    .select({ jobId: savedJobs.jobId, createdAt: savedJobs.createdAt })
    .from(savedJobs)
    .where(eq(savedJobs.userId, userId))
    .orderBy(desc(savedJobs.createdAt))
    .limit(limit);
}

export interface FeedbackInput {
  userId: string;
  jobId: string;
  companyId: string | null;
  action: string;
  reason: string | null;
}

export async function hasFeedback(
  userId: string,
  jobId: string,
  action: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: userJobFeedback.id })
    .from(userJobFeedback)
    .where(
      and(
        eq(userJobFeedback.userId, userId),
        eq(userJobFeedback.jobId, jobId),
        eq(userJobFeedback.action, action as never),
      ),
    )
    .limit(1);
  return row !== undefined;
}

export async function insertFeedback(input: FeedbackInput): Promise<void> {
  await getDb()
    .insert(userJobFeedback)
    .values({
      userId: input.userId,
      jobId: input.jobId,
      companyId: input.companyId,
      action: input.action as never,
      reason: input.reason,
    });
}

/** Hidden job ids and hidden company ids of one viewer (7). */
export async function getHiddenSets(userId: string): Promise<HiddenSets> {
  const rows = await getDb()
    .select({
      jobId: userJobFeedback.jobId,
      companyId: userJobFeedback.companyId,
      action: userJobFeedback.action,
    })
    .from(userJobFeedback)
    .where(
      and(
        eq(userJobFeedback.userId, userId),
        inArray(userJobFeedback.action, [
          "hidden",
          "hidden_company",
        ] as never[]),
      ),
    );
  const hiddenJobIds = new Set<string>();
  const hiddenCompanyIds = new Set<string>();
  for (const row of rows) {
    if (row.action === "hidden_company" && row.companyId) {
      hiddenCompanyIds.add(row.companyId);
    } else {
      hiddenJobIds.add(row.jobId);
    }
  }
  return { hiddenJobIds, hiddenCompanyIds };
}

export interface ReportInput {
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string | null;
}

export async function insertReport(
  input: ReportInput,
): Promise<{ id: string }> {
  const [row] = await getDb()
    .insert(reports)
    .values({
      reporterId: input.reporterId,
      entityType: input.entityType,
      entityId: input.entityId,
      reason: input.reason as never,
      details: input.details,
    })
    .returning({ id: reports.id });
  return { id: row!.id };
}
