import { getDb } from "@/db/client";
import { applicationStatusHistory, applications } from "@/db/schema";
import { errorCodes, forbidden, HttpError, notFound } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  getOwnCandidate,
  type CandidateDto,
  type CompletenessInput,
} from "@/modules/candidates/service";
import { findMemberRole } from "@/modules/companies/service";
import { findContactEmail } from "@/modules/contacts/service";
import { toApplicationDto, type ApplicationDto } from "../api/dto";
import {
  findApplication,
  findJobForApply,
  listForCandidate,
  listPairHistory,
} from "../repo/applications";
import {
  checkApplyEligibility,
  checkApplyTarget,
  checkReapply,
} from "./eligibility";
import { transitionApplication } from "./transition-application";
import type { ApplicationStatus } from "./transitions";

const RECRUITER = new Set(["owner", "admin", "recruiter"]);

function snapshot(
  profile: CandidateDto,
  contactEmail: string | null,
): CompletenessInput {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    desiredTitles: profile.desiredTitles,
    timezone: profile.timezone,
    workHoursStart: profile.workHoursStart,
    workHoursEnd: profile.workHoursEnd,
    workDays: profile.workDays,
    skillCount: profile.skills.length,
    experienceYears: profile.experienceYears,
    languageCount: profile.languages.length,
    salaryMin: profile.salaryMin ? BigInt(profile.salaryMin.amountMinor) : null,
    salaryCurrency: profile.salaryMin?.currency ?? null,
    salaryPeriod: profile.salaryMin?.period ?? null,
    salaryBasis: profile.salaryMin?.basis ?? null,
    workFormats: profile.workFormats,
    employmentTypes: profile.employmentTypes,
    contactEmail,
  };
}

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

export async function applyToJob(
  candidateId: string,
  input: { jobId: string; coverNote: string | null },
): Promise<ApplicationDto> {
  const job = await findJobForApply(input.jobId);
  if (!job) throw notFound();
  checkApplyTarget({
    origin: job.source,
    externalUrl: job.applicationUrl,
    status: job.status,
  });

  const profile = await getOwnCandidate(candidateId);
  if (!profile) throw notFound();
  const email = await findContactEmail(candidateId);
  checkApplyEligibility(snapshot(profile, email));

  const history = await listPairHistory(job.id, candidateId);
  checkReapply(history);
  const reapplyCount = history.some((row) => row.status === "withdrawn")
    ? 1
    : 0;

  await enforceRateLimit("apply", candidateId);
  const coverNote =
    input.coverNote && input.coverNote.length > 0 ? input.coverNote : null;

  try {
    const created = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(applications)
        .values({
          jobId: job.id,
          candidateId,
          coverNote,
          status: "applied",
          reapplyCount,
        })
        .returning();
      if (!row) throw notFound();
      await tx.insert(applicationStatusHistory).values({
        applicationId: row.id,
        fromStatus: null,
        toStatus: "applied",
        actorId: candidateId,
      });
      return row;
    });
    return toApplicationDto({ ...created, jobTitle: job.title });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (postgresCode(error) === "23505") {
      throw new HttpError(
        409,
        errorCodes.alreadyApplied,
        "You already applied to this job",
      );
    }
    throw error;
  }
}

export async function listOwnApplications(
  candidateId: string,
): Promise<ApplicationDto[]> {
  const rows = await listForCandidate(candidateId);
  return rows.map((row) => toApplicationDto(row));
}

export async function getOwnApplication(
  candidateId: string,
  applicationId: string,
): Promise<ApplicationDto> {
  const row = await findApplication(applicationId);
  if (!row || row.candidateId !== candidateId) throw notFound();
  return toApplicationDto(row);
}

export async function withdrawOwnApplication(
  candidateId: string,
  applicationId: string,
): Promise<ApplicationDto> {
  const row = await findApplication(applicationId);
  if (!row || row.candidateId !== candidateId) throw notFound();
  const updated = await transitionApplication({
    applicationId: row.id,
    to: "withdrawn",
    actor: "candidate",
    via: "withdraw",
    actorId: candidateId,
  });
  return toApplicationDto({ ...updated, jobTitle: row.jobTitle });
}

export async function patchApplicationStatus(
  userId: string,
  applicationId: string,
  to: ApplicationStatus,
): Promise<ApplicationDto> {
  const row = await findApplication(applicationId);
  if (!row) throw notFound();

  let actor: "candidate" | "employer";
  if (row.candidateId === userId) {
    actor = "candidate";
  } else {
    const role = await findMemberRole(row.companyId, userId);
    if (!role) throw notFound();
    if (!RECRUITER.has(role)) throw forbidden();
    actor = "employer";
  }

  const updated = await transitionApplication({
    applicationId: row.id,
    to,
    actor,
    via: "patch",
    actorId: userId,
  });
  // 9A: when actor is employer, enqueue application.status_changed for row.candidateId.
  return toApplicationDto({ ...updated, jobTitle: row.jobTitle });
}
