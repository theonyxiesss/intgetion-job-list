import { UGC_LIMITS as L } from "@/config/ugc";

/**
 * The company's review clock (D574): five business days from the moment the
 * video was sent. A reminder on the third business day, one on the day before
 * the end, then the case goes to support. Silence never accepts a video.
 * Business days are Monday to Friday in UTC; holidays are not known.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** The highest stage that has come: 0 none, 1 reminder, 2 last day, 3 overdue. */
export type ReviewStage = 0 | 1 | 2 | 3;

export const REVIEW_STAGE_NAMES = [
  "none",
  "reminder",
  "last_day",
  "overdue",
] as const;

function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** `from` plus `count` business days, keeping the time of day. */
export function addBusinessDays(from: Date, count: number): Date {
  let date = new Date(from.getTime());
  let left = count;
  while (left > 0) {
    date = new Date(date.getTime() + DAY_MS);
    if (isBusinessDay(date)) left -= 1;
  }
  return date;
}

/** When the company's decision is due. */
export function reviewDueAt(submittedAt: Date): Date {
  return addBusinessDays(submittedAt, L.reviewBusinessDays);
}

export function reviewStage(now: Date, submittedAt: Date): ReviewStage {
  const due = reviewDueAt(submittedAt);
  if (now >= due) return 3;
  if (now >= addBusinessDays(submittedAt, L.reviewBusinessDays - 1)) return 2;
  if (now >= addBusinessDays(submittedAt, 3)) return 1;
  return 0;
}
