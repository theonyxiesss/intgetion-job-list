import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { CATALOG_TAGS, REGIONS } from "@/config/markers";
import { getDb } from "@/db/client";
import { logger } from "@/lib/logger";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { listSitemapEntries, searchJobs } from "@/modules/jobs/service";
import { listSalarySkillSlugs } from "@/modules/salaries/service";
import { languageAlternates, localeUrl } from "@/modules/seo/site";

// Read the database per request, never at build time (D210).
export const dynamic = "force-dynamic";

const STATIC_PATHS = [
  "",
  "/jobs",
  "/for-employers",
  "/pricing",
  "/terms",
  "/privacy",
] as const;

function entry(
  path: string,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: localeUrl("en", path),
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: languageAlternates(path) },
  };
}

/** Tag slugs that currently have at least one published job. */
async function presentTagSlugs(): Promise<Set<string>> {
  const present = new Set<string>();
  const rows = await getDb().execute<{ slug: string }>(sql`
    select distinct category as slug from public.jobs where status = 'published'
    union
    select distinct unnest(sectors) from public.jobs where status = 'published'
    union
    select distinct seniority::text from public.jobs
      where status = 'published' and seniority is not null
    union
    select distinct employment_type::text from public.jobs where status = 'published'
    union
    select 'remote' where exists (
      select 1 from public.jobs where status = 'published' and work_format = 'remote'
    )
    union
    select 'non-technical' where exists (
      select 1 from public.jobs
      where status = 'published' and category not in ('engineering', 'data')
    )
    union
    select s.slug from public.skills s
      join public.job_skills js on js.skill_id = s.id
      join public.jobs j on j.id = js.job_id
      where j.status = 'published'
  `);
  for (const row of rows) present.add(row.slug);
  const high = await searchJobs(
    jobSearchQuery.parse({ highPay: "1", limit: 1, sort: "salary" }),
  );
  if (high.items.length > 0) present.add("high-paying");
  // Regions are a time-zone overlap, not a column, so each one is asked
  // separately — one after the other, never in parallel (D247, D295).
  for (const item of REGIONS) {
    const found = await searchJobs(
      jobSearchQuery.parse({
        tzOverlapWith: item.timezone,
        minOverlap: String(item.minOverlap),
        limit: 1,
      }),
    );
    if (found.items.length > 0) present.add(item.slug);
  }
  return present;
}

/** Public pages, jobs, companies and tag pages with hreflang alternates (D210). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = STATIC_PATHS.map((path) => entry(path));
  try {
    // One after the other: parallel queries on one pooled connection hang (D247).
    const { jobs, companies } = await listSitemapEntries();
    const present = await presentTagSlugs();
    // Salary pages only once they show numbers (D260).
    const salarySkills = await listSalarySkillSlugs();
    return [
      ...pages,
      ...jobs.map((job) => entry(`/jobs/${job.id}`, job.updatedAt)),
      ...companies.map((company) =>
        entry(`/companies/${company.slug}`, company.updatedAt),
      ),
      ...CATALOG_TAGS.filter(
        (tag) => tag.kind !== "for-you" && present.has(tag.slug),
      ).map((tag) => entry(`/jobs/t/${tag.slug}`)),
      ...(salarySkills.length ? [entry("/salaries")] : []),
      ...salarySkills.map((slug) => entry(`/salaries/${slug}`)),
    ];
  } catch (error) {
    // A database hiccup still yields the static pages, not a 500.
    logger.error({ err: error }, "sitemap query failed");
    return pages;
  }
}
