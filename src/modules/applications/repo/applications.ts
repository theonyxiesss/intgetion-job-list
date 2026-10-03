import { and, desc, eq, inArray, lt, or } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applicationReveals,
  applications,
  candidateProfiles,
  companyMembers,
  jobs,
} from "@/db/schema";
import type { ApplicationStatus } from "../service/transitions";

type Database = ReturnType<typeof getDb>;
export type AppTx = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Conn = Database | AppTx;

export type ApplicationRow = typeof applications.$inferSelect;

export type JobApplyTarget = {
  id: string;
  companyId: string;
  title: string;
  source: "internal" | "imported";
  status:
    | "draft"
    | "pending_moderation"
    | "published"
    | "paused"
    | "expired"
    | "closed"
    | "removed";
  applicationUrl: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export async function findJobForApply(
  jobId: string,
  conn: Conn = getDb(),
): Promise<JobApplyTarget | null> {
  if (!isUuid(jobId)) return null;
  const [row] = await conn
    .select({
      id: jobs.id,
      companyId: jobs.companyId,
      title: jobs.title,
      source: jobs.source,
      status: jobs.status,
      applicationUrl: jobs.applicationUrl,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .limit(1);
  return row ?? null;
}

export async function listPairHistory(
  jobId: string,
  candidateId: string,
  conn: Conn = getDb(),
): Promise<{ status: ApplicationStatus; reapplyCount: number }[]> {
  return conn
    .select({
      status: applications.status,
      reapplyCount: applications.reapplyCount,
    })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, jobId),
        eq(applications.candidateId, candidateId),
      ),
    );
}

export async function listForCandidate(
  candidateId: string,
  conn: Conn = getDb(),
) {
  return conn
    .select({
      id: applications.id,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      status: applications.status,
      coverNote: applications.coverNote,
      reapplyCount: applications.reapplyCount,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(eq(applications.candidateId, candidateId))
    .orderBy(desc(applications.createdAt));
}

export async function findApplication(
  applicationId: string,
  conn: Conn = getDb(),
): Promise<
  | (ApplicationRow & {
      companyId: string;
      jobTitle: string;
      candidateName: string | null;
    })
  | null
> {
  if (!isUuid(applicationId)) return null;
  const [row] = await conn
    .select({
      application: applications,
      companyId: jobs.companyId,
      jobTitle: jobs.title,
      candidateName: candidateProfiles.fullName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .leftJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return null;
  return {
    ...row.application,
    companyId: row.companyId,
    jobTitle: row.jobTitle,
    candidateName: row.candidateName,
  };
}

export type EmployerListCursor = { createdAt: Date; id: string };

export async function listForJob(
  jobId: string,
  cursor: EmployerListCursor | undefined,
  limit: number,
  conn: Conn = getDb(),
) {
  const older = cursor
    ? or(
        lt(applications.createdAt, cursor.createdAt),
        and(
          eq(applications.createdAt, cursor.createdAt),
          lt(applications.id, cursor.id),
        ),
      )
    : undefined;
  return conn
    .select({
      id: applications.id,
      jobId: applications.jobId,
      jobTitle: jobs.title,
      status: applications.status,
      coverNote: applications.coverNote,
      reapplyCount: applications.reapplyCount,
      createdAt: applications.createdAt,
      candidateId: applications.candidateId,
      candidateName: candidateProfiles.fullName,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .leftJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(
      older
        ? and(eq(applications.jobId, jobId), older)
        : eq(applications.jobId, jobId),
    )
    .orderBy(desc(applications.createdAt), desc(applications.id))
    .limit(limit);
}

export async function lockApplication(applicationId: string, conn: Conn) {
  if (!isUuid(applicationId)) return null;
  const [row] = await conn
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .for("update");
  return row ?? null;
}

export async function findReveal(applicationId: string, conn: Conn = getDb()) {
  const [row] = await conn
    .select()
    .from(applicationReveals)
    .where(eq(applicationReveals.applicationId, applicationId))
    .limit(1);
  return row ?? null;
}

export async function insertReveal(
  conn: Conn,
  input: { applicationId: string; revealedBy: string },
) {
  await conn.insert(applicationReveals).values({
    applicationId: input.applicationId,
    revealedBy: input.revealedBy,
    via: "shortlisted",
  });
}

const OPEN_CONTACT_STATUSES = [
  "shortlisted",
  "interview",
  "offer",
  "hired",
] as const;

/** Applications whose contacts this member may currently read (D23). */
export async function listOpenContactApplications(userId: string) {
  if (!isUuid(userId)) return [];
  return getDb()
    .select({
      applicationId: applications.id,
      candidateName: candidateProfiles.fullName,
      jobTitle: jobs.title,
      status: applications.status,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(
      companyMembers,
      and(
        eq(companyMembers.companyId, jobs.companyId),
        eq(companyMembers.userId, userId),
      ),
    )
    .innerJoin(
      applicationReveals,
      eq(applicationReveals.applicationId, applications.id),
    )
    .leftJoin(
      candidateProfiles,
      eq(candidateProfiles.userId, applications.candidateId),
    )
    .where(inArray(applications.status, [...OPEN_CONTACT_STATUSES]))
    .orderBy(desc(applications.updatedAt));
}

/** True when `viewerId` belongs to a company this candidate applied to. */
export async function viewerSharesApplication(
  viewerId: string,
  candidateId: string,
  conn: Conn = getDb(),
): Promise<boolean> {
  if (!isUuid(viewerId) || !isUuid(candidateId)) return false;
  const [row] = await conn
    .select({ id: applications.id })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .innerJoin(companyMembers, eq(companyMembers.companyId, jobs.companyId))
    .where(
      and(
        eq(applications.candidateId, candidateId),
        eq(companyMembers.userId, viewerId),
      ),
    )
    .limit(1);
  return Boolean(row);
}
