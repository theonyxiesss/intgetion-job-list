import { and, eq, gte, inArray, isNotNull, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, fxRates, jobSkills, jobs, skills } from "@/db/schema";
import type { FxRate } from "@/lib/money";
import { WINDOW_DAYS, type SalarySample } from "../service/stats";

/**
 * Own jobs with a salary that were public within the window (D260). Imported
 * jobs stay out: their numbers belong to their sources (D211).
 */
export async function listSalarySamples(): Promise<SalarySample[]> {
  const rows = await getDb()
    .select({
      jobId: jobs.id,
      seniority: jobs.seniority,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      currency: jobs.salaryCurrency,
      period: jobs.salaryPeriod,
      basis: jobs.salaryBasis,
      skillSlugs: sql<
        string[]
      >`coalesce(array_agg(${skills.slug}) filter (where ${skills.slug} is not null), '{}')`,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .leftJoin(jobSkills, eq(jobSkills.jobId, jobs.id))
    .leftJoin(
      skills,
      and(eq(skills.id, jobSkills.skillId), eq(skills.isActive, true)),
    )
    .where(
      and(
        eq(jobs.source, "internal"),
        inArray(jobs.status, ["published", "paused", "expired", "closed"]),
        gte(
          jobs.publishedAt,
          sql`now() - make_interval(days => ${WINDOW_DAYS})`,
        ),
        or(isNotNull(jobs.salaryMin), isNotNull(jobs.salaryMax)),
        sql`${companies.status} not in ('suspended','rejected')`,
      ),
    )
    .groupBy(jobs.id);
  return rows.map((row) => ({
    ...row,
    skillSlugs: row.skillSlugs ?? [],
  }));
}

/** Rates of the last 8 days; the money helpers drop stale ones (D4). */
export async function listRecentFxRates(): Promise<FxRate[]> {
  return getDb()
    .select({
      currency: fxRates.currency,
      rateToUsd: fxRates.rateToUsd,
      asOf: fxRates.asOf,
    })
    .from(fxRates)
    .where(gte(fxRates.asOf, sql`current_date - interval '8 days'`));
}

export interface SkillName {
  slug: string;
  nameEn: string;
  nameRu: string;
}

export async function findActiveSkill(slug: string): Promise<SkillName | null> {
  const [row] = await getDb()
    .select({ slug: skills.slug, nameEn: skills.nameEn, nameRu: skills.nameRu })
    .from(skills)
    .where(and(eq(skills.slug, slug), eq(skills.isActive, true)))
    .limit(1);
  return row ?? null;
}

export async function listSkillNames(slugs: string[]): Promise<SkillName[]> {
  if (slugs.length === 0) return [];
  return getDb()
    .select({ slug: skills.slug, nameEn: skills.nameEn, nameRu: skills.nameRu })
    .from(skills)
    .where(inArray(skills.slug, slugs));
}
