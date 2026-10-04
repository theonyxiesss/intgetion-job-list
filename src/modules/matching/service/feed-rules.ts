/**
 * Pure rules of the /matches feed (6B): tabs, the cursor, profile hints and
 * the drop of rows the user excluded after they were cached. No SQL.
 */
import { SHOW_THRESHOLD } from "../score/assemble";
import { SUGGEST_UPDATE_THRESHOLD } from "../score/feedback";

export const MATCH_TABS = ["all", "new", "hidden"] as const;
export type MatchTab = (typeof MATCH_TABS)[number];

export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 50;
/** Same as the "new" badge on a job card (DESIGN 8.5). */
export const NEW_JOB_MS = 48 * 60 * 60 * 1000;
/** Hidden tab reads at most this many events. */
export const HIDDEN_TAB_LIMIT = 200;

export type ProfileHint = "salary" | "format" | "timezone";
const HINT_ORDER: readonly ProfileHint[] = ["salary", "format", "timezone"];

export function isMatchTab(value: unknown): value is MatchTab {
  return (
    typeof value === "string" &&
    (MATCH_TABS as readonly string[]).includes(value)
  );
}

/** 10.5: ≥ 3 hides with this reason → offer to update the field. */
export function profileHints(
  counts: Readonly<Record<ProfileHint, number>>,
): ProfileHint[] {
  return HINT_ORDER.filter(
    (field) => counts[field] >= SUGGEST_UPDATE_THRESHOLD,
  );
}

export function isNewJob(publishedAt: string | null, now: Date): boolean {
  if (!publishedAt) return false;
  const age = now.getTime() - new Date(publishedAt).getTime();
  return age >= 0 && age < NEW_JOB_MS;
}

export function clampLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isFinite(limit)) return FEED_DEFAULT_LIMIT;
  return Math.min(FEED_MAX_LIMIT, Math.max(1, Math.trunc(limit)));
}

/**
 * The cursor is an opaque offset into the ordered list. The list is the
 * user's own stored top 200, so an offset is stable between pages unless a
 * recompute happens in between — then the next page simply starts over.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return 0;
  let text: string;
  try {
    text = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const match = /^o:(\d{1,6})$/.exec(text);
  if (!match) return null;
  return Number(match[1]);
}

export function pageOf<T>(
  items: readonly T[],
  offset: number,
  limit: number,
): { items: T[]; nextCursor: string | null } {
  const page = items.slice(offset, offset + limit);
  const next = offset + page.length;
  return {
    items: page,
    nextCursor: next < items.length ? encodeCursor(next) : null,
  };
}

/** Score order: higher first, then job id, as stored (6A). */
export function sortByScore<T extends { score: number; jobId: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (left, right) =>
      right.score - left.score || left.jobId.localeCompare(right.jobId),
  );
}

/** Drops cached rows below the cutoff or excluded by the user since. */
export function visibleMatches<
  T extends { score: number; jobId: string; companyId: string },
>(
  items: readonly T[],
  excluded: { jobIds: ReadonlySet<string>; companyIds: ReadonlySet<string> },
): T[] {
  return items.filter(
    (item) =>
      item.score >= SHOW_THRESHOLD &&
      !excluded.jobIds.has(item.jobId) &&
      !excluded.companyIds.has(item.companyId),
  );
}
