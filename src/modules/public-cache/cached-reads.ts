import { unstable_cache } from "next/cache";
import {
  getJobForPublic,
  getVisibleCompany,
  listPublishedJobsForCompany,
  searchJobs,
} from "@/modules/jobs/service";
import type { JobSearchQuery } from "@/modules/jobs/schemas/search";
import {
  CACHE_KEY_VERSION,
  CATALOG_SEARCH_REVALIDATE_S,
  COMPANY_REVALIDATE_S,
  JOB_PAGE_REVALIDATE_S,
} from "./config";
import { filterLive, isLive, readLiveStates } from "./live-state";

export type PublicJob = NonNullable<
  Awaited<ReturnType<typeof getJobForPublic>>
>;
export type SearchResult = Awaited<ReturnType<typeof searchJobs>>;

/** JSON with object keys sorted, so equal queries always give one cache key. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) =>
          a < b ? -1 : a > b ? 1 : 0,
        ),
      );
    }
    return val;
  });
}

/**
 * Guest view of one job. Content is cached; status is re-read live on every
 * call so a closed or expired job disappears at once.
 * Wrappers are created per call because the tag depends on the id; the key is
 * fixed by the explicit key parts.
 */
export async function cachedJobForPublic(
  id: string,
  locale: string,
): Promise<PublicJob | null> {
  const states = await readLiveStates([id]);
  if (!isLive(states.get(id), new Date())) return null;
  const cached = await unstable_cache(
    () => getJobForPublic(id, { locale }),
    ["public-job", CACHE_KEY_VERSION, id, locale],
    { revalidate: JOB_PAGE_REVALIDATE_S, tags: [`job:${id}`] },
  )();
  // A cached null (job seen before it was published) must not outlive its live
  // status: fall back to an uncached read.
  return cached ?? (await getJobForPublic(id, { locale }));
}

/** Guest search (no viewer data). Cursor pages bypass the cache. */
export async function cachedPublicSearch(
  query: JobSearchQuery,
  locale: string,
  options: { syndicatedOnly?: boolean } = {},
): Promise<SearchResult> {
  const { syndicatedOnly } = options;
  const run = () => searchJobs(query, locale, { hidden: null, syndicatedOnly });
  const result = query.cursor
    ? await run()
    : await unstable_cache(
        run,
        [
          "public-search",
          CACHE_KEY_VERSION,
          locale,
          stableJson({ query, syndicatedOnly }),
        ],
        { revalidate: CATALOG_SEARCH_REVALIDATE_S, tags: ["catalog"] },
      )();
  return { ...result, items: await filterLive(result.items) };
}

export function cachedVisibleCompany(slug: string) {
  return unstable_cache(
    () => getVisibleCompany(slug),
    ["public-company", CACHE_KEY_VERSION, slug],
    { revalidate: COMPANY_REVALIDATE_S, tags: [`company:${slug}`] },
  )();
}

export async function cachedCompanyJobs(companyId: string, locale: string) {
  const jobs = await unstable_cache(
    () => listPublishedJobsForCompany(companyId, locale),
    ["public-company-jobs", CACHE_KEY_VERSION, companyId, locale],
    {
      revalidate: COMPANY_REVALIDATE_S,
      tags: [`company-jobs:${companyId}`],
    },
  )();
  return filterLive(jobs);
}
