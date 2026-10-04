import type { MetadataRoute } from "next";
import { logger } from "@/lib/logger";
import { listSitemapEntries } from "@/modules/jobs/service";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

// Read the database per request, never at build time (D210).
export const dynamic = "force-dynamic";

const STATIC_PATHS = ["", "/jobs", "/for-employers"] as const;

function entry(
  path: string,
  lastModified?: Date,
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl()}/en${path}`,
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: languageAlternates(path) },
  };
}

/** Public pages in both locales with hreflang alternates (D210). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = STATIC_PATHS.map((path) => entry(path));
  try {
    const { jobs, companies } = await listSitemapEntries();
    return [
      ...pages,
      ...jobs.map((job) => entry(`/jobs/${job.id}`, job.updatedAt)),
      ...companies.map((company) =>
        entry(`/companies/${company.slug}`, company.updatedAt),
      ),
    ];
  } catch (error) {
    // A database hiccup still yields the static pages, not a 500.
    logger.error({ err: error }, "sitemap query failed");
    return pages;
  }
}
