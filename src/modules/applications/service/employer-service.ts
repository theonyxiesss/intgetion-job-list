import { validationError, notFound } from "@/lib/http";
import { findMemberRole } from "@/modules/companies/service";
import { safeNotify } from "@/modules/notifications/service";
import {
  toEmployerApplicationDto,
  type EmployerApplicationDto,
} from "../api/dto";
import {
  findApplication,
  findJobForApply,
  isUuid,
  listForJob,
  viewerSharesApplication,
  type EmployerListCursor,
} from "../repo/applications";
import { transitionApplication } from "./transition-application";
import type { ApplicationStatus, TransitionVia } from "./transitions";

const PAGE_DEFAULT = 20;

/**
 * 9A sends these. 5B only names the catalog types from 9A-lib.
 * `application.viewed` — after the first auto-view, recipient is the candidate.
 * `application.status_changed` — after a successful employer PATCH, same recipient.
 */
/** Only the first open of `applied` writes `viewed`. Any later status is a no-op. */
export function needsAutoView(status: ApplicationStatus): boolean {
  return status === "applied";
}

export function employerNotification(input: {
  from: ApplicationStatus;
  to: ApplicationStatus;
  via: TransitionVia;
}): "application.viewed" | "application.status_changed" | null {
  if (
    input.via === "auto_view" &&
    input.from === "applied" &&
    input.to === "viewed"
  ) {
    return "application.viewed";
  }
  if (input.via === "patch") return "application.status_changed";
  return null;
}

function decodeCursor(cursor: string): EmployerListCursor {
  const text = Buffer.from(cursor, "base64url").toString("utf8");
  const separator = text.lastIndexOf("|");
  if (separator < 0) throw validationError();
  const createdAt = new Date(text.slice(0, separator));
  const id = text.slice(separator + 1);
  if (Number.isNaN(createdAt.getTime()) || !isUuid(id)) throw validationError();
  return { createdAt, id };
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

export async function listEmployerApplications(
  userId: string,
  input: { jobId: string; cursor?: string; limit?: number },
): Promise<{ items: EmployerApplicationDto[]; nextCursor: string | null }> {
  const job = await findJobForApply(input.jobId);
  if (!job) throw notFound();
  const role = await findMemberRole(job.companyId, userId);
  if (!role) throw notFound();

  const limit = input.limit ?? PAGE_DEFAULT;
  const cursor = input.cursor ? decodeCursor(input.cursor) : undefined;
  const rows = await listForJob(job.id, cursor, limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextCursor =
    rows.length > limit && last ? encodeCursor(last.createdAt, last.id) : null;
  return {
    items: page.map((row) => toEmployerApplicationDto(row)),
    nextCursor,
  };
}

/**
 * Candidate owners keep their status. A company member's first open of
 * `applied` is the automatic `viewed` edge (D116). A later open does not
 * call `transitionApplication`.
 */
export async function openApplication(
  userId: string,
  applicationId: string,
): Promise<EmployerApplicationDto> {
  const row = await findApplication(applicationId);
  if (!row) throw notFound();
  if (row.candidateId === userId) {
    return toEmployerApplicationDto(row);
  }

  const role = await findMemberRole(row.companyId, userId);
  if (!role) throw notFound();
  if (!needsAutoView(row.status)) return toEmployerApplicationDto(row);

  const updated = await transitionApplication({
    applicationId: row.id,
    to: "viewed",
    actor: "employer",
    via: "auto_view",
    actorId: userId,
  });
  employerNotification({ from: "applied", to: "viewed", via: "auto_view" });
  await safeNotify("application.viewed", [row.candidateId], {
    applicationId: row.id,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
  });
  return toEmployerApplicationDto({
    ...updated,
    jobTitle: row.jobTitle,
    candidateName: row.candidateName,
  });
}

export async function employerMayOpen(
  userId: string,
  jobId: string,
): Promise<boolean> {
  const job = await findJobForApply(jobId);
  if (!job) return false;
  const role = await findMemberRole(job.companyId, userId);
  return Boolean(role);
}

export async function employerCanSeeCandidate(
  viewerId: string,
  candidateId: string,
): Promise<boolean> {
  return viewerSharesApplication(viewerId, candidateId);
}
