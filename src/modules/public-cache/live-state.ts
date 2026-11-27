import { inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobs } from "@/db/schema";

export type LiveState = { status: string; expiresAt: Date | null };

/** A job is live only when published and not past its expiry (cron may lag). */
export function isLive(state: LiveState | undefined, now: Date): boolean {
  if (!state || state.status !== "published") return false;
  return state.expiresAt === null || state.expiresAt > now;
}

/** One cheap query reading only id, status and expires_at for the given jobs. */
export async function readLiveStates(
  ids: readonly string[],
): Promise<Map<string, LiveState>> {
  const result = new Map<string, LiveState>();
  if (ids.length === 0) return result;
  const rows = await getDb()
    .select({ id: jobs.id, status: jobs.status, expiresAt: jobs.expiresAt })
    .from(jobs)
    .where(inArray(jobs.id, [...ids]));
  for (const row of rows) {
    result.set(row.id, { status: row.status, expiresAt: row.expiresAt });
  }
  return result;
}

/** Keeps order; drops items that are not live or no longer exist. */
export async function filterLive<T extends { id: string }>(
  items: T[],
  now: Date = new Date(),
): Promise<T[]> {
  const states = await readLiveStates(items.map((item) => item.id));
  return items.filter((item) => isLive(states.get(item.id), now));
}
