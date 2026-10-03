import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  sql,
} from "drizzle-orm";
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
import type { DuplicateCandidate } from "../service/dedup";

/** Queries only; the rules live in service/ (3.2). */

export const COMPANY_NAME_SIMILARITY = 0.9;

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

export async function sourceStartedSince(sourceId: string, since: Date) {
  const [run] = await getDb()
    .select({ id: importRuns.id })
    .from(importRuns)
    .where(
      and(eq(importRuns.sourceId, sourceId), gt(importRuns.startedAt, since)),
    )
    .limit(1);
  return Boolean(run);
}

export async function beginImportRun(sourceId: string, startedAt: Date) {
  const [run] = await getDb()
    .insert(importRuns)
    .values({ sourceId, startedAt })
    .returning();
  if (!run) throw new Error("Could not create import run");
  return run;
}

export type RunCounters = {
  fetched: number;
  created: number;
  updated: number;
  merged: number;
  rejected: number;
  expired: number;
};

export async function finishImportRun(
  runId: string,
  counters: RunCounters,
  error: string | null,
) {
  await getDb()
    .update(importRuns)
    .set({ ...counters, error, finishedAt: new Date() })
    .where(eq(importRuns.id, runId));
}

export async function markSourceRun(sourceId: string, status: string) {
  await getDb()
    .update(importSources)
    .set({ lastRunAt: new Date(), lastStatus: status })
    .where(eq(importSources.id, sourceId));
}

/**
 * 13.2: an imported company by domain, then by name similarity ≥ 0.9 among
 * imported companies; otherwise a new imported, unverified company. Internal
 * companies are never matched, so an import cannot take one over.
 */
export async function findOrCreateImportedCompany(
  name: string,
  domain: string | null,
) {
  const db = getDb();
  if (domain) {
    const [byDomain] = await db
      .select()
      .from(companies)
      .where(
        and(eq(companies.origin, "imported"), eq(companies.domain, domain)),
      )
      .limit(1);
    if (byDomain) return byDomain;
  }
  const [byName] = await db
    .select()
    .from(companies)
    .where(
      and(
        eq(companies.origin, "imported"),
        sql`public.skill_similarity(${companies.name}, ${name}) >= ${COMPANY_NAME_SIMILARITY}`,
      ),
    )
    .orderBy(desc(sql`public.skill_similarity(${companies.name}, ${name})`))
    .limit(1);
  if (byName) return byName;

  const baseSlug =
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 54) || "imported-company";
  const [created] = await db
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

export async function findLinkedJobId(
  sourceId: string,
  externalId: string,
): Promise<string | null> {
  const [row] = await getDb()
    .select({ jobId: jobSources.jobId })
    .from(jobSources)
    .where(
      and(
        eq(jobSources.importSourceId, sourceId),
        eq(jobSources.externalId, externalId),
      ),
    )
    .limit(1);
  return row?.jobId ?? null;
}

/**
 * Possible duplicates for 13.3: jobs of the same imported company, and
 * internal jobs of internal companies with the same domain or a name
 * similarity ≥ 0.9. Similarities come from pg_trgm; service/dedup decides.
 */
export async function findDuplicateCandidates(input: {
  importedCompanyId: string;
  companyName: string;
  companyDomain: string | null;
  title: string;
  description: string;
}): Promise<DuplicateCandidate[]> {
  const titleSimilarity = sql<number>`public.skill_similarity(${jobs.title}, ${input.title})`;
  const descriptionSimilarity = sql<number>`public.skill_similarity(left(${jobs.description}, 500), left(${input.description}, 500))`;
  const sameInternalCompany = input.companyDomain
    ? sql`(${companies.domain} = ${input.companyDomain} or public.skill_similarity(${companies.name}, ${input.companyName}) >= ${COMPANY_NAME_SIMILARITY})`
    : sql`public.skill_similarity(${companies.name}, ${input.companyName}) >= ${COMPANY_NAME_SIMILARITY}`;
  const rows = await getDb()
    .select({
      jobId: jobs.id,
      source: jobs.source,
      title: jobs.title,
      location: jobs.location,
      companyName: companies.name,
      companyDomain: companies.domain,
      titleSimilarity,
      descriptionSimilarity,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(
      and(
        ne(jobs.status, "removed"),
        sql`(
          (${jobs.companyId} = ${input.importedCompanyId} and ${jobs.source} = 'imported')
          or (${jobs.source} = 'internal' and ${companies.origin} = 'internal' and ${sameInternalCompany})
        )`,
      ),
    )
    .orderBy(desc(titleSimilarity))
    .limit(50);
  return rows.map((row) => ({
    ...row,
    titleSimilarity: Number(row.titleSimilarity),
    descriptionSimilarity: Number(row.descriptionSimilarity),
  }));
}

/**
 * Upserts the (source, external id) row. The first source row of a job is
 * its primary one; later sources add non-primary rows (D71).
 */
export async function linkImportedSource(
  jobId: string,
  sourceId: string,
  externalId: string,
  sourceUrl: string,
  seenAt: Date,
) {
  await getDb()
    .insert(jobSources)
    .values({
      jobId,
      importSourceId: sourceId,
      externalId,
      sourceUrl,
      lastSeenAt: seenAt,
      isPrimary: sql`not exists (select 1 from public.job_sources s where s.job_id = ${jobId} and s.is_primary)`,
    })
    .onConflictDoUpdate({
      target: [jobSources.importSourceId, jobSources.externalId],
      set: { jobId, sourceUrl, lastSeenAt: seenAt },
    });
}

/** Source rows of published imported jobs from this source not seen at `since`. */
export async function sourceRowsNotSeenSince(sourceId: string, since: Date) {
  return getDb()
    .select({ jobId: jobSources.jobId, lastSeenAt: jobSources.lastSeenAt })
    .from(jobSources)
    .innerJoin(jobs, eq(jobs.id, jobSources.jobId))
    .where(
      and(
        eq(jobSources.importSourceId, sourceId),
        eq(jobs.source, "imported"),
        eq(jobs.status, "published"),
        lt(jobSources.lastSeenAt, since),
      ),
    );
}

/** Finished runs of a source that started after a moment. */
export async function finishedRunsSince(sourceId: string, since: Date) {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(importRuns)
    .where(
      and(
        eq(importRuns.sourceId, sourceId),
        isNotNull(importRuns.finishedAt),
        gt(importRuns.startedAt, since),
      ),
    );
  return Number(row?.count ?? 0);
}

export async function sourceRowsOfJobs(jobIds: string[]) {
  if (!jobIds.length) return [];
  return getDb()
    .select({
      jobId: jobSources.jobId,
      sourceId: jobSources.importSourceId,
      lastSeenAt: jobSources.lastSeenAt,
    })
    .from(jobSources)
    .where(inArray(jobSources.jobId, jobIds));
}

/**
 * 13.4: rejected imports go to the admin queue for sample review; one
 * pending row per job, so repeated runs do not pile up.
 */
export async function queueRejectedImport(jobId: string, reason: string) {
  await getDb().execute(sql`
    insert into public.moderation_queue (entity_type, entity_id, reason, risk_flags)
    select 'job', ${jobId}, ${reason}, ${JSON.stringify([reason])}::jsonb
    where not exists (
      select 1 from public.moderation_queue
      where entity_type = 'job' and entity_id = ${jobId} and status = 'pending'
    )
  `);
}

export async function pruneImportRunHistory(now: Date) {
  const before = new Date(now.getTime() - 180 * 86400000);
  await getDb().delete(importRuns).where(lt(importRuns.startedAt, before));
}
