import { unstable_cache } from "next/cache";
import { listPromotedJobs, searchJobs } from "@/modules/jobs/service";
import {
  CACHE_KEY_VERSION,
  GUEST_PICKS_REVALIDATE_S,
  GUEST_PICKS_SIZE,
} from "./config";
import { filterLive } from "./live-state";
import type { SearchResult } from "./cached-reads";

export type FeedJob = SearchResult["items"][number];

/**
 * Guest home-page picks: promoted jobs plus the newest matches, built once per
 * locale and shared by all guests. Statuses are re-checked live after the
 * cache, so a job closed since the snapshot never shows.
 */
export async function getGuestPicks(
  locale: string,
): Promise<{ promoted: FeedJob[]; items: FeedJob[] }> {
  const snapshot = await unstable_cache(
    async () => {
      const promoted = await listPromotedJobs(locale, { hidden: null });
      const result = await searchJobs(
        { limit: GUEST_PICKS_SIZE, minOverlap: 3, sort: "newest" },
        locale,
        { hidden: null },
      );
      return { promoted: promoted as FeedJob[], items: result.items };
    },
    ["guest-picks", CACHE_KEY_VERSION, locale],
    { revalidate: GUEST_PICKS_REVALIDATE_S, tags: ["guest-picks"] },
  )();
  const [promoted, items] = await Promise.all([
    filterLive(snapshot.promoted),
    filterLive(snapshot.items),
  ]);
  return { promoted, items };
}
