import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  auditLogs,
  companies,
  companyMembers,
  companyVerifications,
  jobs,
  users,
} from "@/db/schema";

export type TimeCursor = { createdAt: Date; id: string };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function countUsersSince(since: Date): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(users)
    .where(gt(users.createdAt, since));
  return Number(row?.n ?? 0);
}

export async function countPublishedJobs(): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(jobs)
    .where(eq(jobs.status, "published"));
  return Number(row?.n ?? 0);
}

export type PanelCompanyRow = {
  id: string;
  name: string;
  slug: string;
  status: (typeof companies.$inferSelect)["status"];
  origin: (typeof companies.$inferSelect)["origin"];
  isTrusted: boolean;
  domain: string | null;
  websiteUrl: string | null;
  country: string | null;
  createdAt: Date;
  jobCount: number;
};

const companySelect = {
  id: companies.id,
  name: companies.name,
  slug: companies.slug,
  status: companies.status,
  origin: companies.origin,
  isTrusted: companies.isTrusted,
  domain: companies.domain,
  websiteUrl: companies.websiteUrl,
  country: companies.country,
  createdAt: companies.createdAt,
  jobCount: sql<number>`(select count(*)::int from public.jobs where company_id = ${companies.id})`,
};

export async function listCompaniesPanel(input: {
  limit: number;
  cursor?: TimeCursor;
  status?: PanelCompanyRow["status"];
  q?: string;
}): Promise<PanelCompanyRow[]> {
  const filters = [
    input.status ? eq(companies.status, input.status) : undefined,
    input.q
      ? or(
          ilike(companies.name, `%${escapeLike(input.q)}%`),
          ilike(companies.slug, `%${escapeLike(input.q)}%`),
        )
      : undefined,
    input.cursor
      ? or(
          lt(companies.createdAt, input.cursor.createdAt),
          and(
            eq(companies.createdAt, input.cursor.createdAt),
            lt(companies.id, input.cursor.id),
          ),
        )
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
  const rows = await getDb()
    .select(companySelect)
    .from(companies)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(companies.createdAt), desc(companies.id))
    .limit(input.limit);
  return rows.map((row) => ({ ...row, jobCount: Number(row.jobCount) }));
}

export async function findCompanyPanel(
  id: string,
): Promise<PanelCompanyRow | undefined> {
  const [row] = await getDb()
    .select(companySelect)
    .from(companies)
    .where(eq(companies.id, id))
    .limit(1);
  return row ? { ...row, jobCount: Number(row.jobCount) } : undefined;
}

export async function listCompanyMembers(companyId: string) {
  return getDb()
    .select({
      userId: companyMembers.userId,
      role: companyMembers.role,
      createdAt: companyMembers.createdAt,
    })
    .from(companyMembers)
    .where(eq(companyMembers.companyId, companyId))
    .orderBy(desc(companyMembers.createdAt));
}

export async function listCompanyJobs(companyId: string, limit: number) {
  return getDb()
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .where(eq(jobs.companyId, companyId))
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(limit);
}

export async function listCompanyVerifications(companyId: string) {
  return getDb()
    .select({
      id: companyVerifications.id,
      method: companyVerifications.method,
      status: companyVerifications.status,
      target: companyVerifications.target,
      createdAt: companyVerifications.createdAt,
      verifiedAt: companyVerifications.verifiedAt,
    })
    .from(companyVerifications)
    .where(eq(companyVerifications.companyId, companyId))
    .orderBy(desc(companyVerifications.createdAt));
}

export type PanelJobRow = {
  id: string;
  title: string;
  status: (typeof jobs.$inferSelect)["status"];
  source: (typeof jobs.$inferSelect)["source"];
  riskScore: number;
  companyId: string;
  companyName: string;
  createdAt: Date;
};

export async function listJobsPanel(input: {
  limit: number;
  cursor?: TimeCursor;
  q?: string;
  status?: PanelJobRow["status"];
  source?: PanelJobRow["source"];
  company?: string;
}): Promise<PanelJobRow[]> {
  const filters = [
    input.q ? ilike(jobs.title, `%${escapeLike(input.q)}%`) : undefined,
    input.status ? eq(jobs.status, input.status) : undefined,
    input.source ? eq(jobs.source, input.source) : undefined,
    input.company
      ? ilike(companies.name, `%${escapeLike(input.company)}%`)
      : undefined,
    input.cursor
      ? or(
          lt(jobs.createdAt, input.cursor.createdAt),
          and(
            eq(jobs.createdAt, input.cursor.createdAt),
            lt(jobs.id, input.cursor.id),
          ),
        )
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
  return getDb()
    .select({
      id: jobs.id,
      title: jobs.title,
      status: jobs.status,
      source: jobs.source,
      riskScore: jobs.riskScore,
      companyId: companies.id,
      companyName: companies.name,
      createdAt: jobs.createdAt,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(jobs.createdAt), desc(jobs.id))
    .limit(input.limit);
}

export async function findUserPanel(id: string) {
  const [row] = await getDb()
    .select({
      id: users.id,
      authUid: users.authUid,
      platformRole: users.platformRole,
      status: users.status,
      locale: users.locale,
      createdAt: users.createdAt,
      lastActiveAt: users.lastActiveAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return row;
}

export async function listUserCompanies(userId: string) {
  return getDb()
    .select({
      id: companies.id,
      name: companies.name,
      role: companyMembers.role,
      status: companies.status,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.userId, userId))
    .orderBy(desc(companyMembers.createdAt));
}

export async function countUserApplications(userId: string): Promise<number> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(applications)
    .where(eq(applications.candidateId, userId));
  return Number(row?.n ?? 0);
}

export async function listAuditForUser(userId: string, limit: number) {
  return getDb()
    .select({
      id: auditLogs.id,
      actorId: auditLogs.actorId,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(or(eq(auditLogs.actorId, userId), eq(auditLogs.entityId, userId)))
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);
}
