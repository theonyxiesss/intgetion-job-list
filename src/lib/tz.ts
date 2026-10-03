/**
 * Timezone helpers (spec 10.6, decision D6; conventions in D65, D68).
 *
 * Only IANA zone names are accepted, resolved through Intl. Fixed offsets
 * ("UTC+3", "+03:00", "Etc/GMT-3") are rejected. Offset lookups happen per
 * instant, so DST transition days are handled by construction.
 */

export class InvalidTimeZoneError extends Error {
  constructor(timeZone: string) {
    super(`not a valid IANA time zone: ${String(timeZone)}`);
    this.name = "InvalidTimeZoneError";
  }
}

export class InvalidTimeError extends Error {
  constructor(time: string) {
    super(`time must be "HH:MM" (00:00–23:59), got: ${String(time)}`);
    this.name = "InvalidTimeError";
  }
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
// Explicit fixed offsets are forbidden (D6/D65): "+03:00", "+0300", "UTC+3",
// "GMT-5", "Etc/GMT-3". Zone keys without a numeric offset ("UTC", "GMT",
// "Etc/UTC") pass as ordinary IANA keys.
const FIXED_OFFSET_RE =
  /^(?:[+-]\d{2}(?::?\d{2})?|(?:utc|gmt)[+-]\d{1,2}(?::\d{2})?|etc\/gmt(?:[+-]\d{1,2})?)$/i;

export function isValidTimeZone(timeZone: string): boolean {
  if (typeof timeZone !== "string" || timeZone.length === 0) return false;
  if (FIXED_OFFSET_RE.test(timeZone)) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function assertTimeZone(timeZone: string): string {
  if (!isValidTimeZone(timeZone)) {
    throw new InvalidTimeZoneError(timeZone);
  }
  return timeZone;
}

const dateTimeFormatCache = new Map<string, Intl.DateTimeFormat>();

function getDateTimeFormat(timeZone: string): Intl.DateTimeFormat {
  let format = dateTimeFormatCache.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    dateTimeFormatCache.set(timeZone, format);
  }
  return format;
}

/**
 * Offset of the zone at the given instant, in minutes east of UTC. Resolved
 * per instant, so it is correct across DST transitions.
 */
export function timeZoneOffsetMinutes(instant: Date, timeZone: string): number {
  assertTimeZone(timeZone);
  const parts = getDateTimeFormat(timeZone).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    return part ? Number(part.value) : 0;
  };
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  // Historical zones can have second-level offsets; round to whole minutes.
  return Math.round((asUtc - instant.getTime()) / 60000);
}

export interface ParsedWallTime {
  hour: number;
  minute: number;
}

export function parseWallTime(time: string): ParsedWallTime {
  if (typeof time !== "string" || !TIME_RE.test(time)) {
    throw new InvalidTimeError(time);
  }
  const [hour, minute] = time.split(":").map(Number) as [number, number];
  return { hour, minute };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * UTC instant of local wall time `time` on calendar day `day` in `timeZone`.
 *
 * `day` contributes its UTC calendar date (y/m/d) — callers iterate days by
 * the UTC calendar (10.6). The offset is probed at the instant itself, so the
 * fixed point converges on normal and on transition days.
 *
 * Conventions for the two broken cases (D65):
 * - local time does not exist (spring forward): interpreted with the offset
 *   in effect *before* the transition, i.e. the wall clock jumps forward
 *   across the gap together with the zone (like Java/Temporal "earlier");
 * - local time repeats (fall back): the first occurrence is used, which is
 *   the same pre-transition offset.
 */
export function localToUtc(day: Date, time: string, timeZone: string): Date {
  assertTimeZone(timeZone);
  const { hour, minute } = parseWallTime(time);
  const guess = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    hour,
    minute,
  );

  const offsetBefore = timeZoneOffsetMinutes(
    new Date(guess - DAY_MS),
    timeZone,
  );
  const candidate = guess - offsetBefore * 60000;
  if (timeZoneOffsetMinutes(new Date(candidate), timeZone) === offsetBefore) {
    return new Date(candidate);
  }

  // The probe offset did not stick; retry with the offset at the candidate.
  const offsetHere = timeZoneOffsetMinutes(new Date(candidate), timeZone);
  const candidate2 = guess - offsetHere * 60000;
  if (timeZoneOffsetMinutes(new Date(candidate2), timeZone) === offsetHere) {
    return new Date(candidate2);
  }

  // No instant renders this wall time: spring-forward gap (D65).
  return new Date(guess - offsetBefore * 60000);
}

export interface WorkWindow {
  /** Local "HH:MM" window start. */
  start: string;
  /** Local "HH:MM" window end; earlier than start means past midnight (D68). */
  end: string;
}

export interface WorkHoursSchedule extends WorkWindow {
  timeZone: string;
  /** ISO weekdays (1=Mon … 7=Sun) on which the candidate works. */
  workDays: readonly number[];
}

export interface JobWorkHours {
  timeZone: string;
  /** Defaults to "09:00" (10.6). */
  start?: string;
  /** Defaults to "18:00" (10.6). */
  end?: string;
}

export interface WorkHoursDayOverlap {
  /** UTC calendar date, "YYYY-MM-DD". */
  date: string;
  isoWeekday: number;
  workingDay: boolean;
  overlapMinutes: number;
}

export interface WorkHoursOverlapResult {
  /** Average intersection in minutes per working day (10.6). 0 if the range
   * contains no working day. */
  averageOverlapMinutes: number;
  workingDayCount: number;
  /** Per-day breakdown for debugging (D68). */
  days: WorkHoursDayOverlap[];
}

export interface WorkHoursOverlapInput {
  candidate: WorkHoursSchedule;
  job: JobWorkHours;
  /** First day of the range; its UTC calendar date is day one. */
  from: Date;
  /** Range length in UTC calendar days, default 14 (10.6). */
  days?: number;
}

const JOB_DEFAULT_START = "09:00";
const JOB_DEFAULT_END = "18:00";

function isValidIsoWeekday(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

function isoWeekdayOf(utcMidnight: Date): number {
  const sundayBased = utcMidnight.getUTCDay();
  return sundayBased === 0 ? 7 : sundayBased;
}

function formatDate(utcMidnight: Date): string {
  const y = utcMidnight.getUTCFullYear();
  const m = String(utcMidnight.getUTCMonth() + 1).padStart(2, "0");
  const d = String(utcMidnight.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Overlap of candidate and job working hours over the next `days` UTC
 * calendar days (10.6, D68). Days whose ISO weekday (candidate-local
 * calendar) is not in `candidate.workDays` are skipped. Windows may cross
 * midnight (end < start → end on the next calendar day); end == start is a
 * zero-length window, not 24 hours. A candidate window that crosses midnight
 * can meet the job window of the following job day (night shift vs 04:00
 * start), so job windows of day d and d+1 are both tried — daily job windows
 * are disjoint, so the sum never double counts.
 */
export function workHoursOverlap(
  input: WorkHoursOverlapInput,
): WorkHoursOverlapResult {
  const { candidate, job, from } = input;
  const daysCount = input.days ?? 14;
  if (!Number.isInteger(daysCount) || daysCount < 0) {
    throw new RangeError("days must be a non-negative integer");
  }
  assertTimeZone(candidate.timeZone);
  assertTimeZone(job.timeZone);
  parseWallTime(candidate.start);
  parseWallTime(candidate.end);
  const jobStart = job.start ?? JOB_DEFAULT_START;
  const jobEnd = job.end ?? JOB_DEFAULT_END;
  parseWallTime(jobStart);
  parseWallTime(jobEnd);
  for (const day of candidate.workDays) {
    if (!isValidIsoWeekday(day)) {
      throw new RangeError(
        `workDays must contain ISO weekdays 1..7, got: ${String(day)}`,
      );
    }
  }

  const baseMidnight = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );

  const dayResults: WorkHoursDayOverlap[] = [];
  let totalOverlapMinutes = 0;

  for (let i = 0; i < daysCount; i += 1) {
    const dayMidnight = new Date(baseMidnight + i * DAY_MS);
    const weekday = isoWeekdayOf(dayMidnight);
    const workingDay = candidate.workDays.includes(weekday);

    let overlapMinutes = 0;
    if (workingDay) {
      const candidateWindow = localWindow(
        dayMidnight,
        candidate.start,
        candidate.end,
        candidate.timeZone,
      );
      for (const jobDayOffset of [0, 1]) {
        const jobWindow = localWindow(
          new Date(+dayMidnight + jobDayOffset * DAY_MS),
          jobStart,
          jobEnd,
          job.timeZone,
        );
        const overlapMs =
          Math.min(+candidateWindow.end, +jobWindow.end) -
          Math.max(+candidateWindow.start, +jobWindow.start);
        overlapMinutes += Math.max(0, overlapMs) / 60000;
      }
    }

    dayResults.push({
      date: formatDate(dayMidnight),
      isoWeekday: weekday,
      workingDay,
      overlapMinutes,
    });
    totalOverlapMinutes += overlapMinutes;
  }

  const workingDayCount = dayResults.filter((day) => day.workingDay).length;
  return {
    averageOverlapMinutes:
      workingDayCount > 0 ? totalOverlapMinutes / workingDayCount : 0,
    workingDayCount,
    days: dayResults,
  };
}

function localWindow(
  dayMidnight: Date,
  start: string,
  end: string,
  timeZone: string,
): { start: Date; end: Date } {
  const startDate = localToUtc(dayMidnight, start, timeZone);
  const endDay = end < start ? new Date(+dayMidnight + DAY_MS) : dayMidnight;
  const endDate = localToUtc(endDay, end, timeZone);
  return { start: startDate, end: endDate };
}
