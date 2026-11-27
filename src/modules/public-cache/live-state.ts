import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { companies, jobs } from "@/db/schema";

export type LiveState = {
  status: string;
  expiresAt: Date | null;
  companyStatus: string;
};

const UUID_RE = /^[0-9a-f-]{36}$/i;

/** Same id check as getJobForPublic; jobs.id is a uuid column. */
export function isJobId(id: string): boolean {
  return UUID_RE.test(id);
}

/** Companies in these states must not show jobs or pages to guests. */
const HIDDEN_COMPANY_STATUSES = ["suspended", "rejected"];

export function isCompanyStatusVisible(status: string | null): boolean {
  return status !== null && !HIDDEN_COMPANY_STATUSES.includes(status);
}

/**
 * A job is live only when published, not past its expiry (cron may lag) and
 * its company is not suspended or rejected.
 */
export function isLive(state: LiveState | undefined, now: Date): boolean {
  if (!state || state.status !== "published") return false;
  if (!isCompanyStatusVisible(state.companyStatus)) return false;
  return state.expiresAt === null || state.expiresAt > now;
}

/**
 * One cheap query reading only id, status, expires_at and the company status
 * for the given jobs. Non-uuid ids are dropped before querying.
 */
export async function readLiveStates(
  ids: readonly string[],
): Promise<Map<string, LiveState>> {
  const result = new Map<string, LiveState>();
  const validIds = ids.filter(isJobId);
  if (validIds.length === 0) return result;
  const rows = await getDb()
    .select({
      id: jobs.id,
      status: jobs.status,
      expiresAt: jobs.expiresAt,
      companyStatus: companies.status,
    })
    .from(jobs)
    .innerJoin(companies, eq(companies.id, jobs.companyId))
    .where(inArray(jobs.id, validIds));
  for (const row of rows) {
    result.set(row.id, {
      status: row.status,
      expiresAt: row.expiresAt,
      companyStatus: row.companyStatus,
    });
  }
  return result;
}

/** Live company status by slug (only the status column), null if missing. */
export async function readLiveCompanyStatus(
  slug: string,
): Promise<string | null> {
  const [row] = await getDb()
    .select({ status: companies.status })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  return row?.status ?? null;
}

/** Keeps order; drops items that are not live or no longer exist. */
export async function filterLive<T extends { id: string }>(
  items: T[],
  now: Date = new Date(),
): Promise<T[]> {
  const states = await readLiveStates(items.map((item) => item.id));
  return items.filter((item) => isLive(states.get(item.id), now));
}
