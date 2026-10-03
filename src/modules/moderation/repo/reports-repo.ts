import { and, asc, eq, gt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, jobs, reports } from "@/db/schema";

export type ReportRow = typeof reports.$inferSelect;
export type ReportStatus = ReportRow["status"];

export type ReportListRow = ReportRow & {
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
};

/** Oldest first, like the moderation queue (14.4 SLA). */
export async function listReports(input: {
  limit: number;
  status: ReportStatus;
  cursor?: { createdAt: Date; id: string };
}): Promise<ReportListRow[]> {
  const filters = [
    eq(reports.status, input.status),
    input.cursor
      ? or(
          gt(reports.createdAt, input.cursor.createdAt),
          and(
            eq(reports.createdAt, input.cursor.createdAt),
            gt(reports.id, input.cursor.id),
          ),
        )
      : undefined,
  ].filter((filter): filter is SQL => filter !== undefined);
  const rows = await getDb()
    .select({
      report: reports,
      jobTitle: jobs.title,
      companyId: sql<
        string | null
      >`coalesce(${jobs.companyId}, ${companies.id})`,
      companyName: companies.name,
    })
    .from(reports)
    .leftJoin(
      jobs,
      and(eq(reports.entityType, "job"), eq(jobs.id, reports.entityId)),
    )
    .leftJoin(
      companies,
      or(
        and(
          eq(reports.entityType, "company"),
          eq(companies.id, reports.entityId),
        ),
        eq(companies.id, jobs.companyId),
      ),
    )
    .where(and(...filters))
    .orderBy(asc(reports.createdAt), asc(reports.id))
    .limit(input.limit);
  return rows.map((row) => ({
    ...row.report,
    jobTitle: row.jobTitle,
    companyId: row.companyId,
    companyName: row.companyName,
  }));
}

/** Decides an open report; only one admin wins (conditional on `open`). */
export async function claimReport(
  id: string,
  status: "confirmed" | "dismissed",
  adminId: string,
): Promise<ReportRow | undefined> {
  const [row] = await getDb()
    .update(reports)
    .set({ status, decidedBy: adminId, decidedAt: new Date() })
    .where(and(eq(reports.id, id), eq(reports.status, "open")))
    .returning();
  return row;
}

export async function findReport(id: string): Promise<ReportRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(reports)
    .where(eq(reports.id, id))
    .limit(1);
  return row;
}

/** The company a report is about: itself, or the owner of the reported job. */
export async function companyOfReport(
  report: Pick<ReportRow, "entityType" | "entityId">,
): Promise<string | null> {
  if (report.entityType === "company") return report.entityId;
  if (report.entityType !== "job") return null;
  const [row] = await getDb()
    .select({ companyId: jobs.companyId })
    .from(jobs)
    .where(eq(jobs.id, report.entityId))
    .limit(1);
  return row?.companyId ?? null;
}

/** Confirmed reports about the company or any of its jobs since `since`. */
export async function confirmedReportsForCompany(
  companyId: string,
  since: Date,
): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n from public.reports r
    where r.status = 'confirmed' and r.decided_at >= ${since.toISOString()}::timestamptz
      and (
        (r.entity_type = 'company' and r.entity_id = ${companyId})
        or (r.entity_type = 'job' and r.entity_id in (
          select id from public.jobs where company_id = ${companyId}))
      )
  `);
  return Number(rows[0]?.n ?? 0);
}

/** Queues the company once while an earlier item is still pending. */
export async function queueCompanyOnce(companyId: string, reason: string) {
  await getDb().execute(sql`
    insert into public.moderation_queue (entity_type, entity_id, reason, risk_flags)
    select 'company', ${companyId}, ${reason}, ${JSON.stringify([reason])}::jsonb
    where not exists (
      select 1 from public.moderation_queue
      where entity_type = 'company' and entity_id = ${companyId}
        and reason = ${reason} and status = 'pending'
    )
  `);
}

export async function countOpenReports(): Promise<number> {
  const rows = await getDb().execute<{ n: number }>(
    sql`select count(*)::int as n from public.reports where status = 'open'`,
  );
  return Number(rows[0]?.n ?? 0);
}
