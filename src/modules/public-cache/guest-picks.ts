import { unstable_cache } from "next/cache";
import { listPromotedJobs, searchJobs } from "@/modules/jobs/service";
import {
  CACHE_KEY_VERSION,
  GUEST_PICKS_REVALIDATE_S,
  GUEST_PICKS_SIZE,
} from "./config";
import { isLive, readLiveStates } from "./live-state";
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
  const build = async () => {
    const promoted = await listPromotedJobs(locale, { hidden: null });
    const result = await searchJobs(
      { limit: GUEST_PICKS_SIZE, minOverlap: 3, sort: "newest" },
      locale,
      { hidden: null },
    );
    return { promoted, items: result.items };
  };
  const cached = await unstable_cache(
    build,
    ["guest-picks", CACHE_KEY_VERSION, locale],
    { revalidate: GUEST_PICKS_REVALIDATE_S, tags: ["guest-picks"] },
  )();
  // An empty snapshot is never trusted: it only happens on an empty catalog
  // (new site, tests), so rebuilding costs nothing in steady state and the
  // first published jobs show at once instead of after the revalidate window.
  const snapshot =
    cached.items.length === 0 && cached.promoted.length === 0
      ? await build()
      : cached;
  // One live-status query over both lists.
  const states = await readLiveStates([
    ...snapshot.promoted.map((job) => job.id),
    ...snapshot.items.map((job) => job.id),
  ]);
  const now = new Date();
  const live = (job: FeedJob) => isLive(states.get(job.id), now);
  return {
    promoted: snapshot.promoted.filter(live),
    items: snapshot.items.filter(live),
  };
}
