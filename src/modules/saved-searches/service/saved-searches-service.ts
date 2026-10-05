import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { HttpError, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { searchJobs } from "@/modules/jobs/service";
import { deliverInTransaction } from "@/modules/notifications/service";
import * as repo from "../repo/saved-searches";
import { SAVED_SEARCH_LIMIT, type CreateSavedSearchInput } from "../schemas";

/** Jobs in one alert at most (D234). */
export const ALERT_MAX_JOBS = 10;

/**
 * The catalog query as stored (D233): known filters only, sorted, without
 * the page cursor or sort, so the same search is the same row.
 */
export function normalizeQuery(query: string): string | null {
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  params.delete("cursor");
  params.delete("sort");
  const parsed = jobSearchQuery.safeParse(
    Object.fromEntries(
      [...new Set(params.keys())].map((key) => [
        key,
        params.getAll(key).length > 1 ? params.getAll(key) : params.get(key),
      ]),
    ),
  );
  if (!parsed.success) return null;
  const sorted = new URLSearchParams(
    [...params.entries()].filter(([, value]) => value !== "").sort(),
  );
  const normalized = sorted.toString();
  return normalized ? normalized.slice(0, 1000) : null;
}

export async function listSavedSearches(userId: string) {
  return repo.listForUser(userId);
}

export async function saveSearch(
  userId: string,
  input: CreateSavedSearchInput,
) {
  const query = normalizeQuery(input.query);
  if (!query) {
    throw new HttpError(422, "VALIDATION_ERROR", "Nothing to save", {
      reason: "empty_search",
    });
  }
  const existing = await repo.listForUser(userId);
  if (
    !existing.some((search) => search.query === query) &&
    existing.length >= SAVED_SEARCH_LIMIT
  ) {
    throw new HttpError(409, "SAVED_SEARCH_LIMIT", "Too many saved searches", {
      reason: "limit",
    });
  }
  return repo.upsert({ userId, name: input.name, query });
}

export async function setSearchAlert(
  id: string,
  userId: string,
  alert: boolean,
) {
  if (!(await repo.setAlert(id, userId, alert))) throw notFound();
}

export async function deleteSavedSearch(id: string, userId: string) {
  if (!(await repo.remove(id, userId))) throw notFound();
}

export type AlertJob = { id: string; title: string; companyName: string };

/** New jobs for one saved search, as the owner would see them (D234). */
async function newJobsFor(
  search: repo.SavedSearch & { locale: "en" | "ru" },
): Promise<AlertJob[]> {
  const params = new URLSearchParams(search.query);
  params.set("sort", "newest");
  params.set("postedWithin", "30");
  params.set("limit", "50");
  const query = jobSearchQuery.parse(
    Object.fromEntries(
      [...new Set(params.keys())].map((key) => [
        key,
        params.getAll(key).length > 1 ? params.getAll(key) : params.get(key),
      ]),
    ),
  );
  const since = +(search.lastAlertAt ?? search.createdAt);
  const result = await searchJobs(query, search.locale, {
    hidden: await getHiddenSetsForViewer(search.userId),
  });
  return result.items
    .filter((job) => job.publishedAt && Date.parse(job.publishedAt) > since)
    .slice(0, ALERT_MAX_JOBS)
    .map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.company.name,
    }));
}

/**
 * Daily (D234): every saved search with its alert on gets one notification
 * with the jobs published since its last alert. Nothing new — nothing is
 * sent and the search keeps waiting. The slot is claimed in the same
 * transaction as the notification, so repeated runs send nothing twice.
 */
export async function runSearchAlerts(input?: {
  now?: Date;
  /** Test seam: the jobs source; the catalog search has its own tests. */
  findJobs?: typeof newJobsFor;
}): Promise<{ checked: number; sent: number; failed: number }> {
  const now = input?.now ?? new Date();
  const findJobs = input?.findJobs ?? newJobsFor;
  let sent = 0;
  let failed = 0;
  const due = await repo.listDue(now);
  for (const search of due) {
    try {
      const jobs = await findJobs(search);
      if (jobs.length === 0) continue;
      const delivered = await getDb().transaction(async (tx) => {
        const claimed = await tx.execute(sql`
          update public.saved_searches set last_alert_at = ${now.toISOString()}::timestamptz
          where id = ${search.id}
            and (last_alert_at is null
                 or last_alert_at < ${now.toISOString()}::timestamptz - interval '20 hours')
          returning 1
        `);
        if (claimed.length === 0) return false;
        await deliverInTransaction(tx, {
          userId: search.userId,
          type: "search.alert",
          locale: search.locale,
          payload: {
            savedSearchId: search.id,
            searchName: search.name,
            matchCount: jobs.length,
            sampleJobIds: jobs.slice(0, 5).map((job) => job.id),
          },
          emailPayload: {
            query: search.query,
            jobs: jobs.map((job) => ({
              jobTitle: `${job.title} — ${job.companyName}`,
            })),
          },
          now,
        });
        return true;
      });
      if (delivered) sent += 1;
    } catch (error) {
      failed += 1;
      logger.error(
        { err: error, savedSearchId: search.id },
        "search alert failed",
      );
    }
  }
  return { checked: due.length, sent, failed };
}
