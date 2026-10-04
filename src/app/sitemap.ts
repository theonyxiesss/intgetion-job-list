import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { CATALOG_TAGS } from "@/config/markers";
import { getDb } from "@/db/client";
import { siteUrl } from "@/lib/supabase/env";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { searchJobs } from "@/modules/jobs/service";

export const dynamic = "force-dynamic";

/** Tag URLs that currently have at least one published job. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const present = new Set<string>();
  try {
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
  } catch {
    return [];
  }
  const base = siteUrl();
  return ["en", "ru"].flatMap((locale) =>
    CATALOG_TAGS.filter(
      (tag) => tag.kind !== "for-you" && present.has(tag.slug),
    ).map((tag) => ({
      url: `${base}/${locale}/jobs/t/${tag.slug}`,
    })),
  );
}
