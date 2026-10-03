import { and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "@/db/client";
import {
  companies,
  importRuns,
  importSources,
  jobSources,
  jobs,
} from "@/db/schema";
import type { ImportAdapter } from "../adapters/types";

export async function ensureFixtureSource(adapter: ImportAdapter) {
  const [row] = await getDb()
    .insert(importSources)
    .values({ name: adapter.sourceName, kind: adapter.kind, enabled: false })
    .onConflictDoUpdate({
      target: importSources.name,
      set: { kind: adapter.kind },
    })
    .returning();
  if (!row) throw new Error("Could not register fixture source");
  return row;
}

export async function sourceStartedWithin(sourceId: string, since: Date) {
  const [run] = await getDb()
    .select({ id: importRuns.id })
    .from(importRuns)
    .where(and(eq(importRuns.sourceId, sourceId), gt(importRuns.startedAt, since)))
    .limit(1);
  return Boolean(run);
}

export async function beginImportRun(sourceId: string) {
  const [run] = await getDb()
    .insert(importRuns)
    .values({ sourceId })
    .returning();
  if (!run) throw new Error("Could not create import run");
  return run;
}

export async function completeImportRun(
  runId: string,
  metrics: {
    fetched: number;
    created: number;
    updated: number;
    merged: number;
    rejected: number;
    expired: number;
    error?: string | null;
  },
) {
  await getDb()
    .update(importRuns)
    .set({ ...metrics, finishedAt: new Date() })
    .where(eq(importRuns.id, runId));
}

export async function markSourceRun(sourceId: string, status: string) {
  await getDb()
    .update(importSources)
    .set({ lastRunAt: new Date(), lastStatus: status })
    .where(eq(importSources.id, sourceId));
}

export async function findOrCreateImportedCompany(
  name: string,
  domain: string | null,
) {
  const byDomain = domain
    ? await getDb()
        .select()
        .from(companies)
        .where(and(eq(companies.origin, "imported"), eq(companies.domain, domain)))
        .limit(1)
    : [];
  const byName = byDomain.length
    ? []
    : await getDb()
        .select()
        .from(companies)
        .where(
          and(
            eq(companies.origin, "imported"),
            sql`lower(${companies.name}) = lower(${name})`,
          ),
        )
        .limit(1);
  const existing = byDomain[0] ?? byName[0];
  if (existing) return existing;
  const baseSlug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "imported-company";
  const [created] = await getDb()
    .insert(companies)
    .values({
      name,
      slug: `${baseSlug}-${randomUUID().slice(0, 8)}`,
      domain,
      origin: "imported",
      status: "unverified",
      isTrusted: false,
    })
    .returning();
  if (!created) throw new Error("Could not create imported company");
  return created;
}

export async function findByExternalId(sourceId: string, externalId: string) {
  const [row] = await getDb()
    .select({ job: jobs, source: jobSources })
    .from(jobSources)
    .innerJoin(jobs, eq(jobs.id, jobSources.jobId))
    .where(
      and(
        eq(jobSources.importSourceId, sourceId),
        eq(jobSources.externalId, externalId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findDuplicateJob(input: {
  companyId: string;
  title: string;
  description: string;
  sourceId: string;
  externalId: string;
}) {
  const linked = await findByExternalId(input.sourceId, input.externalId);
  if (linked) return { job: linked.job, exactSource: true, internal: false };
  const [row] = await getDb()
    .select({ job: jobs })
    .from(jobs)
    .where(
      and(
        eq(jobs.companyId, input.companyId),
        sql`public.skill_similarity(${jobs.title}, ${input.title}) >= 0.85`,
        sql`public.skill_similarity(left(${jobs.description}, 500), left(${input.description}, 500)) >= 0.8`,
      ),
    )
    .limit(1);
  if (row)
    return {
      job: row.job,
      exactSource: false,
      internal: row.job.source === "internal",
    };

  const [domainDuplicate] = await getDb()
    .select({ job: jobs })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(
      and(
        eq(jobs.source, "imported"),
        eq(companies.origin, "imported"),
        sql`lower(unaccent(${jobs.title})) = lower(unaccent(${input.title}))`,
        sql`(companies.domain = (select domain from public.companies where id = ${input.companyId}) or lower(unaccent(companies.name)) = (select lower(unaccent(name)) from public.companies where id = ${input.companyId}))`,
      ),
    )
    .limit(1);
  return domainDuplicate
    ? { job: domainDuplicate.job, exactSource: false, internal: false }
    : null;
}

export async function linkImportedSource(
  jobId: string,
  sourceId: string,
  externalId: string,
  sourceUrl: string,
) {
  await getDb()
    .insert(jobSources)
    .values({
      jobId,
      importSourceId: sourceId,
      externalId,
      sourceUrl,
    })
    .onConflictDoUpdate({
      target: jobSources.jobId,
      set: { lastSeenAt: new Date(), sourceUrl },
    });
}

export async function staleLinkedJobs(sourceId: string, now = new Date()) {
  const rows = await getDb()
    .select({ jobId: jobSources.jobId, lastSeenAt: jobSources.lastSeenAt })
    .from(jobSources)
    .innerJoin(jobs, eq(jobs.id, jobSources.jobId))
    .where(
      and(
        eq(jobSources.importSourceId, sourceId),
        eq(jobs.source, "imported"),
        eq(jobs.status, "published"),
        lt(jobSources.lastSeenAt, now),
      ),
    );
  const expired: string[] = [];
  for (const row of rows) {
    const [count] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(importRuns)
      .where(
        and(
          eq(importRuns.sourceId, sourceId),
          isNotNull(importRuns.finishedAt),
          gt(importRuns.startedAt, row.lastSeenAt),
          lt(importRuns.startedAt, now),
        ),
      );
    if ((count?.count ?? 0) >= 1) expired.push(row.jobId);
  }
  return expired;
}

export async function pruneImportRunHistory(now = new Date()) {
  const before = new Date(now.getTime() - 180 * 86400000);
  await getDb().delete(importRuns).where(lt(importRuns.startedAt, before));
}
