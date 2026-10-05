/** Optional "preferences" cookie: ids of the last viewed jobs (D228). */
export const RECENT_JOBS_COOKIE = "recent_jobs";
export const RECENT_JOBS_MAX = 6;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Dot-separated job ids, newest first; anything malformed is dropped. */
export function parseRecentJobs(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(".").filter((id) => UUID.test(id)))].slice(
    0,
    RECENT_JOBS_MAX,
  );
}
