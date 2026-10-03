import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, fxRates, importSources, jobLanguages, jobSkills, jobSources, jobs, skills } from "@/db/schema";

export async function getFxRates() {
  return getDb().select({ currency: fxRates.currency, rateToUsd: fxRates.rateToUsd, asOf: fxRates.asOf }).from(fxRates)
    .where(gte(fxRates.asOf, sql`current_date - interval '8 days'`));
}
export async function listSearchSkillOptions(locale: string) {
  return getDb().select({ id: skills.id, name: locale === "ru" ? skills.nameRu : skills.nameEn }).from(skills).where(eq(skills.isActive, true)).orderBy(skills.nameEn).limit(200);
}

export async function searchPublicJobs(query: { q?: string; category?: string; workFormat?: string[]; employmentType?: string[]; country?: string; source?: string; postedWithin?: number; cursor?: { publishedAt: string; id: string; sort?: string; rank?: number; salary?: string | null }; limit: number; sort: string; skills?: string[] }) {
  const predicates = [eq(jobs.status, "published" as const), sql`${companies.status} not in ('suspended','rejected')`];
  if (query.category) predicates.push(eq(jobs.category, query.category));
  if (query.workFormat?.length) predicates.push(inArray(jobs.workFormat, query.workFormat as never[]));
  if (query.employmentType?.length) predicates.push(inArray(jobs.employmentType, query.employmentType as never[]));
  if (query.country) predicates.push(sql`(${jobs.locationCountry} = ${query.country} or ${query.country} = any(${jobs.countryRestrictions}))`);
  if (query.source) predicates.push(eq(jobs.source, query.source as "internal" | "imported"));
  if (query.postedWithin) predicates.push(gte(jobs.publishedAt, sql`now() - (${query.postedWithin}::text || ' days')::interval`));
  if (query.q) predicates.push(sql`${jobs.fts} @@ websearch_to_tsquery('simple', ${query.q})`);
  if (query.cursor) {
    if (query.sort === "salary") predicates.push(sql`(coalesce(${jobs.salaryMax}, ${jobs.salaryMin}, -1), ${jobs.publishedAt}, ${jobs.id}) < (coalesce(${query.cursor.salary}::bigint, -1), ${query.cursor.publishedAt}::timestamptz, ${query.cursor.id}::uuid)`);
    else if (query.sort === "relevance" && query.q && query.cursor.rank !== undefined) predicates.push(sql`(ts_rank(${jobs.fts}, websearch_to_tsquery('simple', ${query.q})), ${jobs.publishedAt}, ${jobs.id}) < (${query.cursor.rank}::real, ${query.cursor.publishedAt}::timestamptz, ${query.cursor.id}::uuid)`);
    else predicates.push(sql`(${jobs.publishedAt}, ${jobs.id}) < (${query.cursor.publishedAt}::timestamptz, ${query.cursor.id}::uuid)`);
  }
  if (query.skills?.length) predicates.push(...query.skills.map((skillId) => sql`exists (select 1 from public.job_skills js where js.job_id=${jobs.id} and js.skill_id=${skillId}::uuid)`));
  const order = query.sort === "relevance" && query.q
    ? sql`ts_rank(${jobs.fts}, websearch_to_tsquery('simple', ${query.q})) desc, ${jobs.publishedAt} desc, ${jobs.id} desc`
    : query.sort === "salary" ? sql`coalesce(${jobs.salaryMax}, ${jobs.salaryMin}) desc nulls last, ${jobs.publishedAt} desc, ${jobs.id} desc`
      : desc(jobs.publishedAt);
  const rows = await getDb().select({ job: jobs, company: companies, sourceName: importSources.name, sourceUrl: jobSources.sourceUrl, searchRank: query.q ? sql<number>`ts_rank(${jobs.fts}, websearch_to_tsquery('simple', ${query.q}))` : sql<number>`0` }).from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(jobSources, eq(jobSources.jobId, jobs.id)).leftJoin(importSources, eq(importSources.id, jobSources.importSourceId))
    .where(and(...predicates)).orderBy(order).limit(query.limit + 1);
  return rows;
}

export async function getPublicJobById(id: string) {
  const [row] = await getDb().select({ job: jobs, company: companies, sourceName: importSources.name, sourceUrl: jobSources.sourceUrl }).from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(jobSources, eq(jobSources.jobId, jobs.id)).leftJoin(importSources, eq(importSources.id, jobSources.importSourceId))
    .where(and(eq(jobs.id, id), sql`${companies.status} not in ('suspended','rejected')`)).limit(1);
  return row ?? null;
}

export async function getJobRequirements(ids: string[]) {
  if (!ids.length) return { skillRows: [], languageRows: [] };
  const [skillRows, languageRows] = await Promise.all([
    getDb().select({ jobId: jobSkills.jobId, id: skills.id, nameEn: skills.nameEn, nameRu: skills.nameRu }).from(jobSkills).innerJoin(skills, eq(skills.id, jobSkills.skillId)).where(inArray(jobSkills.jobId, ids)),
    getDb().select({ jobId: jobLanguages.jobId, lang: jobLanguages.lang, minLevel: jobLanguages.minLevel }).from(jobLanguages).where(inArray(jobLanguages.jobId, ids)),
  ]);
  return { skillRows, languageRows };
}

export async function listCompanyPublicJobs(companyId: string, limit = 20) {
  return getDb().select({ job: jobs, company: companies, sourceName: importSources.name, sourceUrl: jobSources.sourceUrl }).from(jobs).innerJoin(companies, eq(companies.id, jobs.companyId))
    .leftJoin(jobSources, eq(jobSources.jobId, jobs.id)).leftJoin(importSources, eq(importSources.id, jobSources.importSourceId))
    .where(and(eq(jobs.companyId, companyId), eq(jobs.status, "published"), sql`${companies.status} not in ('suspended','rejected')`))
    .orderBy(desc(jobs.publishedAt)).limit(limit);
}

export async function getPublicCompanyBySlug(slug: string) {
  const [company] = await getDb().select().from(companies).where(and(eq(companies.slug, slug), sql`${companies.status} not in ('suspended','rejected')`)).limit(1);
  return company ?? null;
}
