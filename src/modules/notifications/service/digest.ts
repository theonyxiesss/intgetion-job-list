import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { logger } from "@/lib/logger";
import { timeZoneOffsetMinutes } from "@/lib/tz";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import { resolveDelivery } from "../lib/catalog";
import { toEmailJob, type EmailJobPayload } from "../lib/email-jobs";
import {
  DIGEST_HOUR_LOCAL,
  DIGEST_MIN_SCORE,
  nextDigestAt,
} from "../lib/digest";
import { insertEmail, insertNotification } from "../repo/notifications";

/** At most this many jobs in one digest (D186). */
export const DIGEST_MAX_JOBS = 5;
/** The first digest looks back this far for new jobs (D187). */
export const DIGEST_FIRST_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
/** A second claim within this window is refused, whatever the cron does (D187). */
const CLAIM_GUARD = "20 hours";

/**
 * Due when the recipient's local clock is in the 08:00 hour and, after an
 * earlier digest, the next permitted morning (24h interval, D101) has come.
 */
export function isDigestDue(
  timeZone: string,
  lastDigestAt: Date | null,
  now: Date,
): boolean {
  const local = new Date(+now + timeZoneOffsetMinutes(now, timeZone) * 60000);
  if (local.getUTCHours() !== DIGEST_HOUR_LOCAL) return false;
  return (
    lastDigestAt === null || +nextDigestAt(timeZone, lastDigestAt, now) <= +now
  );
}

export type DigestCandidateJob = {
  jobId: string;
  title: string;
  companyName: string;
  score: number;
  publishedAt: string | null;
  /** The card the email shows (D330); absent in older test seams. */
  email?: EmailJobPayload;
};

/**
 * New since the last digest (or the last week for the first one), score at
 * least 0.65, best first, at most five (D186, D187).
 */
export function pickDigestJobs(
  jobs: readonly DigestCandidateJob[],
  lastDigestAt: Date | null,
  now: Date,
): DigestCandidateJob[] {
  const since = lastDigestAt ? +lastDigestAt : +now - DIGEST_FIRST_LOOKBACK_MS;
  return jobs
    .filter(
      (job) =>
        job.score >= DIGEST_MIN_SCORE &&
        job.publishedAt !== null &&
        Date.parse(job.publishedAt) > since,
    )
    .sort((a, b) => b.score - a.score || a.jobId.localeCompare(b.jobId))
    .slice(0, DIGEST_MAX_JOBS);
}

type CandidateRow = {
  user_id: string;
  timezone: string;
  locale: string;
  last_digest_at: string | Date | null;
};

type PreferenceRow = { type: string; channel: string; enabled: boolean };

function chatEvent(locale: "en" | "ru", count: number): string {
  const template = (locale === "ru" ? ru : en).digest.chatEvent;
  return template.replace("{count}", String(count));
}

/**
 * Hourly (D185): every active candidate whose morning it is gets at most one
 * digest a day with the new strong matches — in-app always, email through
 * the 9A queue when allowed, and a note in the bot chat.
 */
export type DigestJobLoader = (
  userId: string,
  locale: "en" | "ru",
  now: Date,
) => Promise<DigestCandidateJob[]>;

/** The candidate's current feed from 6B, as the "Matches" page shows it. */
const loadFeedJobs: DigestJobLoader = async (userId, locale, now) => {
  // Loaded lazily: matching imports jobs, and jobs imports this module.
  const { loadMatchScreen } = await import("@/modules/matching/service");
  const screen = await loadMatchScreen(userId, {
    tab: "all",
    limit: 50,
    locale,
    now,
  });
  return screen.items.map((item) => ({
    jobId: item.job.id,
    title: item.job.title,
    companyName: item.job.company.name,
    score: item.score,
    publishedAt: item.job.publishedAt,
    email: toEmailJob(item.job, locale),
  }));
};

export async function runDigestCron(input?: {
  now?: Date;
  /** Test seam: the feed source; matching itself is covered by 6B tests. */
  loadJobs?: DigestJobLoader;
}): Promise<{
  checked: number;
  sent: number;
  empty: number;
  failed: number;
}> {
  const now = input?.now ?? new Date();
  const loadJobs = input?.loadJobs ?? loadFeedJobs;
  const db = getDb();
  const rows = await db.execute<CandidateRow>(sql`
    select cp.user_id, cp.timezone, u.locale, cp.last_digest_at
    from public.candidate_profiles cp
    join public.users u on u.id = cp.user_id
    where u.status = 'active' and cp.timezone is not null
      and (cp.last_digest_at is null
           or cp.last_digest_at < ${now.toISOString()}::timestamptz - interval '20 hours')
  `);
  let sent = 0;
  let empty = 0;
  let failed = 0;
  let checked = 0;
  for (const row of rows) {
    const lastDigestAt = row.last_digest_at
      ? new Date(row.last_digest_at)
      : null;
    if (!isDigestDue(row.timezone, lastDigestAt, now)) continue;
    checked += 1;
    try {
      const outcome = await sendDigest(row, lastDigestAt, now, loadJobs);
      if (outcome === "sent") sent += 1;
      else empty += 1;
    } catch (error) {
      failed += 1;
      logger.error({ err: error, userId: row.user_id }, "digest failed");
    }
  }
  return { checked, sent, empty, failed };
}

async function sendDigest(
  row: CandidateRow,
  lastDigestAt: Date | null,
  now: Date,
  loadJobs: DigestJobLoader,
): Promise<"sent" | "empty"> {
  const locale = row.locale === "ru" ? "ru" : "en";
  const jobs = pickDigestJobs(
    await loadJobs(row.user_id, locale, now),
    lastDigestAt,
    now,
  );
  if (jobs.length === 0) return "empty";

  const delivered = await getDb().transaction(async (tx) => {
    // Claim today's slot first: a parallel or repeated run finds it taken.
    const claimed = await tx.execute<{ user_id: string }>(sql`
      update public.candidate_profiles
      set last_digest_at = ${now.toISOString()}::timestamptz
      where user_id = ${row.user_id}
        and (last_digest_at is null
             or last_digest_at < ${now.toISOString()}::timestamptz - ${CLAIM_GUARD}::interval)
      returning user_id
    `);
    if (claimed.length === 0) return false;
    const preferences = await tx.execute<PreferenceRow>(sql`
      select type, channel, enabled from public.notification_preferences
      where user_id = ${row.user_id}
    `);
    const payload = {
      matchCount: jobs.length,
      sampleJobIds: jobs.map((job) => job.jobId),
    };
    let notificationId: string | null = null;
    if (resolveDelivery("matches.digest", "inapp", preferences).allowed) {
      notificationId = await insertNotification(tx, {
        userId: row.user_id,
        type: "matches.digest",
        payload,
      });
    }
    if (resolveDelivery("matches.digest", "email", preferences).allowed) {
      // The 9A dispatcher renders, sends, retries and skips addresses that
      // are placeholders (Telegram accounts, D217).
      await insertEmail(tx, {
        userId: row.user_id,
        type: "matches.digest",
        locale,
        payload: {
          ...payload,
          jobs: jobs.map(
            (job) =>
              job.email ?? { jobTitle: `${job.title} — ${job.companyName}` },
          ),
        },
        sendAfter: now,
        notificationId,
      });
    }
    return true;
  });
  if (!delivered) return "empty";

  try {
    const { postSystemEvent } = await import("@/modules/bot/service");
    await postSystemEvent(row.user_id, chatEvent(locale, jobs.length));
  } catch (error) {
    // The digest already went out; the chat note is a convenience.
    logger.warn({ err: error, userId: row.user_id }, "digest chat note failed");
  }
  return "sent";
}
