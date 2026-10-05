import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { rateLimited } from "@/lib/http";
import { privacyHash } from "@/lib/privacy-hash";

export type RateRule = { limit: number; windowSeconds: number };

/** Section 6 limits that exist so far. Other rows arrive with their features. */
export const rateRules = {
  /** login, keyed by IP + email: 5 per 15 minutes */
  login: { limit: 5, windowSeconds: 15 * 60 },
  /** magic link and password reset emails, keyed by email: 3 per hour */
  emailLink: { limit: 3, windowSeconds: 60 * 60 },
  /** registration, keyed by IP: 10 per hour */
  register: { limit: 10, windowSeconds: 60 * 60 },
  // Below: section 6 limits for later subphases, ready before they start.
  /** job creation by an unverified company, keyed by company id (3B) */
  jobCreateUnverified: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /** job creation by a verified company, keyed by company id (3B) */
  jobCreateVerified: { limit: 50, windowSeconds: 24 * 60 * 60 },
  /** applications, keyed by user id (5A) */
  apply: { limit: 30, windowSeconds: 24 * 60 * 60 },
  /** job reports, keyed by user id (4B) */
  report: { limit: 10, windowSeconds: 24 * 60 * 60 },
  /** verification requests (emails, DNS tokens), keyed by company id (10B) */
  verificationRequest: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /** personal data exports, keyed by user id (10C) */
  dataExport: { limit: 5, windowSeconds: 24 * 60 * 60 },
  /** bot messages from a guest, keyed by IP + bot session (7A) */
  botGuest: { limit: 30, windowSeconds: 24 * 60 * 60 },
  /** bot messages from a user, keyed by user id (7A) */
  botUser: { limit: 200, windowSeconds: 24 * 60 * 60 },
  /** cookie choices sent to the consent journal, keyed by IP (D220) */
  consent: { limit: 30, windowSeconds: 60 * 60 },
  /** analytics beacons, keyed by IP; over the limit they are dropped (D225) */
  beacon: { limit: 600, windowSeconds: 60 * 60 },
  /** guest JSON reads of jobs, keyed by IP (P-SCRAPE, D218) */
  publicApi: { limit: 120, windowSeconds: 60 },
  /** admin host sign-in failures, keyed by account and by IP (D252) */
  adminLogin: { limit: 5, windowSeconds: 15 * 60 },
} as const satisfies Record<string, RateRule>;

/** Fixed window (D26): windows start at multiples of the window length. */
export function windowStart(now: Date, windowSeconds: number): Date {
  const size = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / size) * size);
}

export function retryAfterSeconds(now: Date, rule: RateRule): number {
  const end =
    windowStart(now, rule.windowSeconds).getTime() + rule.windowSeconds * 1000;
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000));
}

export function rateKey(bucket: string, subject: string): string {
  return `${bucket}:${privacyHash(subject)}`;
}

/** Counts one hit atomically and returns the count in the current window. */
export async function hit(
  key: string,
  rule: RateRule,
  now: Date = new Date(),
): Promise<number> {
  const start = windowStart(now, rule.windowSeconds);
  const rows = await getDb().execute<{ count: number }>(sql`
    insert into rate_limit_counters (key, window_start, count)
    values (${key}, ${start.toISOString()}, 1)
    on conflict (key, window_start)
    do update set count = rate_limit_counters.count + 1
    returning count
  `);
  return Number(rows[0]?.count ?? 0);
}

/** Hits already recorded in the current window, without adding one. */
export async function windowCount(
  bucket: keyof typeof rateRules,
  subject: string,
  now: Date = new Date(),
): Promise<number> {
  const rule = rateRules[bucket];
  const start = windowStart(now, rule.windowSeconds);
  const rows = await getDb().execute<{ count: number }>(sql`
    select count
    from rate_limit_counters
    where key = ${rateKey(bucket, subject)}
      and window_start = ${start.toISOString()}
  `);
  return Number(rows[0]?.count ?? 0);
}

/** Throws 429 RATE_LIMITED with Retry-After once the window is used up. */
export async function enforceRateLimit(
  bucket: keyof typeof rateRules,
  subject: string,
  now: Date = new Date(),
): Promise<void> {
  const rule = rateRules[bucket];
  const count = await hit(rateKey(bucket, subject), rule, now);
  if (count > rule.limit) throw rateLimited(retryAfterSeconds(now, rule));
}

/** Hourly cleanup (section 17: counters live 48 hours). */
export async function deleteExpiredCounters(now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const rows = await getDb().execute<{ n: number }>(sql`
    with gone as (
      delete from rate_limit_counters
      where window_start < ${cutoff.toISOString()}
      returning 1
    )
    select count(*)::int as n from gone
  `);
  return Number(rows[0]?.n ?? 0);
}
