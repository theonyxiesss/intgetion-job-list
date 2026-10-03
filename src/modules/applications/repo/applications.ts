import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { applications, jobs } from "@/db/schema";
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
): Promise<(ApplicationRow & { companyId: string; jobTitle: string }) | null> {
  if (!isUuid(applicationId)) return null;
  const [row] = await conn
    .select({
      application: applications,
      companyId: jobs.companyId,
      jobTitle: jobs.title,
    })
    .from(applications)
    .innerJoin(jobs, eq(jobs.id, applications.jobId))
    .where(eq(applications.id, applicationId))
    .limit(1);
  if (!row) return null;
  return {
    ...row.application,
    companyId: row.companyId,
    jobTitle: row.jobTitle,
  };
}
