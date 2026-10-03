/**
 * Feedback service (4B): save/unsave, hide (job or company), reports and the
 * event recorder that 5A (applied) and 8A (applied_external) call. Reads of
 * public job data go through the jobs module's service surface only.
 */
import { HttpError, notFound, validationError } from "@/lib/http";
import { getJobForPublic, listPublicJobsByIds } from "@/modules/jobs/service";
import * as repo from "../repo/feedback-repo";
import {
  InvalidFeedbackError,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_UNIQUE_VIOLATION_CODE,
  isReportEntityType,
  isReportReason,
  validateFeedbackEvent,
  type HiddenSets,
} from "../rules";

function postgresCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (
    let depth = 0;
    depth < 5 && current && typeof current === "object";
    depth += 1
  ) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export interface FeedbackEventInput {
  userId: string;
  jobId: string;
  companyId: string | null;
  action: string;
  reason?: string | null;
}

/**
 * Records one user_job_feedback event. Validated against the 4.1 rules;
 * 5A records `applied`, 8A `applied_external` (D110).
 */
export async function recordJobFeedback(
  input: FeedbackEventInput,
): Promise<void> {
  let event;
  try {
    event = validateFeedbackEvent(input.action, input.reason ?? null);
  } catch (error) {
    if (error instanceof InvalidFeedbackError) {
      throw validationError(error.message);
    }
    throw error;
  }
  await repo.insertFeedback({
    userId: input.userId,
    jobId: input.jobId,
    companyId: input.companyId,
    action: event.action,
    reason: event.reason,
  });
}

async function visibleJobOr404(jobId: string, userId: string) {
  const job = await getJobForPublic(jobId, { userId });
  if (!job) throw notFound();
  return job;
}

export interface SaveResult {
  saved: boolean;
}

export async function saveJobForUser(
  userId: string,
  jobId: string,
): Promise<SaveResult> {
  const job = await visibleJobOr404(jobId, userId);
  const inserted = await repo.insertSavedJob(userId, jobId);
  if (inserted) {
    await recordJobFeedback({
      userId,
      jobId,
      companyId: job.company.id,
      action: "saved",
    });
  }
  return { saved: true };
}

export async function unsaveJobForUser(
  userId: string,
  jobId: string,
): Promise<SaveResult> {
  await visibleJobOr404(jobId, userId);
  const deleted = await repo.deleteSavedJob(userId, jobId);
  if (deleted) {
    await recordJobFeedback({
      userId,
      jobId,
      companyId: null,
      action: "unsaved",
    });
  }
  return { saved: false };
}

export type HideScope = "job" | "company";

export interface HideInput {
  scope: HideScope;
  reason?: string;
}

export async function hideJobForUser(
  userId: string,
  jobId: string,
  input: HideInput,
): Promise<{ hidden: true }> {
  const job = await visibleJobOr404(jobId, userId);
  await recordJobFeedback({
    userId,
    jobId,
    companyId: job.company.id,
    action: input.scope === "company" ? "hidden_company" : "hidden",
    reason: input.reason,
  });
  return { hidden: true };
}

export interface ReportInput {
  reason: string;
  details?: string | null;
}

export interface ReportResult {
  reportId: string;
}

/**
 * Creates an open report for the job (14.5). One report per object per
 * reporter: the unique index violation maps to 409 ALREADY_REPORTED (D111).
 * Rate limiting lives in the route (enforceRateLimit("report", …)).
 */
export async function reportJobForUser(
  userId: string,
  jobId: string,
  input: ReportInput,
): Promise<ReportResult> {
  await visibleJobOr404(jobId, userId);
  if (!isReportReason(input.reason)) {
    throw validationError(`reason must be one of the fixed report reasons`);
  }
  const details = input.details?.trim() ? input.details.trim() : null;
  if (details && details.length > REPORT_DETAILS_MAX_LENGTH) {
    throw validationError(
      `details must be at most ${REPORT_DETAILS_MAX_LENGTH} characters`,
    );
  }
  try {
    const { id } = await repo.insertReport({
      reporterId: userId,
      entityType: "job",
      entityId: jobId,
      reason: input.reason,
      details,
    });
    return { reportId: id };
  } catch (error) {
    if (postgresCode(error) === REPORT_UNIQUE_VIOLATION_CODE) {
      throw new HttpError(
        409,
        "ALREADY_REPORTED",
        "You have already reported this job",
      );
    }
    throw error;
  }
}

export interface SavedJobView {
  job: {
    id: string;
    title: string;
    company: { id: string; name: string; slug: string };
  };
  savedAt: string;
}

/**
 * Saved jobs of the user as a minimal view (published, company visible),
 * newest first, with the viewer's own hidden jobs filtered out (D113).
 */
export async function listSavedJobsForUser(
  userId: string,
  limit = 100,
): Promise<SavedJobView[]> {
  const saved = await repo.listSavedJobIds(userId, limit);
  if (saved.length === 0) return [];
  const hidden = await repo.getHiddenSets(userId);
  const jobs = await listPublicJobsByIds(saved.map(({ jobId }) => jobId));
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const entries: SavedJobView[] = [];
  for (const { jobId, createdAt } of saved) {
    const job = byId.get(jobId);
    if (!job) continue;
    if (
      hidden.hiddenJobIds.has(job.id) ||
      hidden.hiddenCompanyIds.has(job.company.id)
    ) {
      continue;
    }
    entries.push({
      job: {
        id: job.id,
        title: job.title,
        company: {
          id: job.company.id,
          name: job.company.name,
          slug: job.company.slug,
        },
      },
      savedAt: createdAt.toISOString(),
    });
  }
  return entries;
}

export async function isJobSavedForUser(
  userId: string,
  jobId: string,
): Promise<boolean> {
  return repo.isSaved(userId, jobId);
}

export async function getHiddenSetsForViewer(
  userId: string,
): Promise<HiddenSets> {
  return repo.getHiddenSets(userId);
}

export { isReportEntityType };
