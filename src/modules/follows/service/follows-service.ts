import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { HttpError, notFound } from "@/lib/http";
import { logger } from "@/lib/logger";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import {
  getVisibleCompany,
  listPublishedJobsForCompany,
} from "@/modules/jobs/service";
import { deliverInTransaction } from "@/modules/notifications/service";
import * as repo from "../repo/follows";

/** At most this many followed companies per user (D239). */
export const FOLLOW_LIMIT = 50;
/** Jobs in one company alert at most (D240). */
const ALERT_MAX_JOBS = 10;

export async function followCompany(userId: string, slug: string) {
  const company = await getVisibleCompany(slug);
  if (!company) throw notFound();
  if (
    !(await repo.isFollowing(userId, company.id)) &&
    (await repo.countForUser(userId)) >= FOLLOW_LIMIT
  ) {
    throw new HttpError(409, "FOLLOW_LIMIT", "Too many followed companies", {
      reason: "limit",
    });
  }
  await repo.follow(userId, company.id);
}

export async function unfollowCompany(userId: string, slug: string) {
  const company = await getVisibleCompany(slug);
  if (!company) throw notFound();
  await repo.unfollow(userId, company.id);
}

export const isFollowing = repo.isFollowing;
export const listFollows = repo.listForUser;
export const countFollowers = repo.countFollowers;

export type CompanyAlertJob = { id: string; title: string };

type DueFollow = Awaited<ReturnType<typeof repo.listDue>>[number];

async function newJobsOf(follow: DueFollow): Promise<CompanyAlertJob[]> {
  const since = +(follow.lastAlertAt ?? follow.createdAt);
  const jobs = await listPublishedJobsForCompany(
    follow.companyId,
    follow.locale,
    { hidden: await getHiddenSetsForViewer(follow.userId) },
  );
  return jobs
    .filter((job) => job.publishedAt && Date.parse(job.publishedAt) > since)
    .slice(0, ALERT_MAX_JOBS)
    .map((job) => ({ id: job.id, title: job.title }));
}

/**
 * Daily with the saved-search alerts (D240): each follower gets one
 * notification per company with the jobs published since the last one.
 * Nothing new — nothing sent; the slot is claimed with the notification.
 */
export async function runCompanyAlerts(input?: {
  now?: Date;
  /** Test seam: the jobs source; company listings have their own tests. */
  findJobs?: (follow: DueFollow) => Promise<CompanyAlertJob[]>;
}): Promise<{ checked: number; sent: number; failed: number }> {
  const now = input?.now ?? new Date();
  const findJobs = input?.findJobs ?? newJobsOf;
  const due = await repo.listDue(now);
  let sent = 0;
  let failed = 0;
  for (const follow of due) {
    try {
      const jobs = await findJobs(follow);
      if (jobs.length === 0) continue;
      const delivered = await getDb().transaction(async (tx) => {
        const claimed = await tx.execute(sql`
          update public.company_follows
          set last_alert_at = ${now.toISOString()}::timestamptz
          where user_id = ${follow.userId} and company_id = ${follow.companyId}
            and (last_alert_at is null
                 or last_alert_at < ${now.toISOString()}::timestamptz - interval '20 hours')
          returning 1
        `);
        if (claimed.length === 0) return false;
        await deliverInTransaction(tx, {
          userId: follow.userId,
          type: "company.new_jobs",
          locale: follow.locale,
          payload: {
            companyId: follow.companyId,
            companySlug: follow.companySlug,
            companyName: follow.companyName,
            matchCount: jobs.length,
            sampleJobIds: jobs.slice(0, 5).map((job) => job.id),
          },
          emailPayload: {
            jobs: jobs.map((job) => ({ jobTitle: job.title })),
          },
          now,
        });
        return true;
      });
      if (delivered) sent += 1;
    } catch (error) {
      failed += 1;
      logger.error(
        { err: error, companyId: follow.companyId },
        "company alert failed",
      );
    }
  }
  return { checked: due.length, sent, failed };
}
