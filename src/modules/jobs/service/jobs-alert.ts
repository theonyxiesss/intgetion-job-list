import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { SalaryBasis, SalaryPeriod } from "@/lib/money";
import { currencyExponent, toMoneyDto } from "@/lib/money";
import type { TelegramSender } from "@/lib/telegram-bot";

/** This file's applied_at is the watermark (D341). */
export const JOBS_ALERT_MIGRATION = "0033_jobs_alert.sql";

/** One channel post per cron tick. `/api/cron/telegram` already runs every 5 minutes (D395). */
const BATCH = 1;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type JobsAlertRow = {
  id: string;
  title: string;
  companyName: string;
  salaryMin: bigint | null;
  salaryMax: bigint | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryBasis: string | null;
  workFormat: string | null;
  location: string | null;
  locationCountry: string | null;
  /** Earliest job_status_history row with to_status published. */
  firstPublishedAt: Date | null;
};

export type JobsAlertDelivery = "empty" | "sent" | "failed";

export function parseJobsAlertChatId(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

export function isIntgetionHost(host: string): boolean {
  const name = host.toLowerCase().split(":")[0] ?? "";
  return name === "intgetion.com" || name.endsWith(".intgetion.com");
}

/** One card line. A line break in the source would split that line. */
export function jobsAlertSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function isPeriod(value: string | null): value is SalaryPeriod {
  return value === "hour" || value === "month" || value === "year";
}

function isBasis(value: string | null): value is SalaryBasis {
  return value === "gross" || value === "net";
}

function jobsAlertLocationText(value: string | null): string {
  if (!value) return "";
  return jobsAlertSingleLine(value).trim();
}

/** Employer currency, or USD when the job did not name one (D341). */
export function jobsAlertCurrency(raw: string | null): string {
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

/** remote / hybrid / onsite. Location newlines are already one line (D389). */
export function jobsAlertPlace(row: JobsAlertRow): string {
  const location = jobsAlertLocationText(row.location);
  const country = row.locationCountry?.trim() ?? "";
  if (row.workFormat === "remote") return "Remote";
  if (row.workFormat === "hybrid") {
    return location ? `Hybrid · ${location}` : "Hybrid";
  }
  if (location) return location;
  if (country) return country;
  return "On-site";
}

const TEN = BigInt(10);
const ZERO = BigInt(0);
const THOUSAND = BigInt(1000);
const MILLION = BigInt(1_000_000);
const TEN_THOUSAND = BigInt(10_000);

/** Nearest tenth, halves away from zero. Display only; stored units stay BigInt. */
function roundTenths(amountMinor: bigint, unit: bigint): bigint {
  return (amountMinor * TEN + unit / BigInt(2)) / unit;
}

function withSuffix(tenths: bigint, suffix: string): string {
  const whole = tenths / TEN;
  const fraction = tenths % TEN;
  return fraction === ZERO
    ? `${whole}${suffix}`
    : `${whole}.${fraction}${suffix}`;
}

/** Compact major units: 6000 → 6k, 11000 → 11k, 1500000 → 1.5m. */
function compactMinor(amountMinor: bigint, currency: string): string {
  const scale = TEN ** BigInt(currencyExponent(currency));
  const thousand = scale * THOUSAND;
  const million = scale * MILLION;
  if (amountMinor >= million) {
    return withSuffix(roundTenths(amountMinor, million), "m");
  }
  if (amountMinor >= thousand) {
    const tenths = roundTenths(amountMinor, thousand);
    if (tenths >= TEN_THOUSAND) {
      return withSuffix(roundTenths(amountMinor, million), "m");
    }
    return withSuffix(tenths, "k");
  }
  const whole = amountMinor / scale;
  const fraction = amountMinor % scale;
  if (fraction === ZERO) return whole.toString();
  const width = currencyExponent(currency);
  const digits = fraction.toString().padStart(width, "0").replace(/0+$/, "");
  return `${whole}.${digits}`;
}

function jobsAlertAmountToken(
  amountMinor: bigint,
  currency: string,
  period: SalaryPeriod,
  basis: SalaryBasis,
): string {
  const dto = toMoneyDto(amountMinor, currency, period, basis);
  return compactMinor(BigInt(dto.amountMinor), dto.currency);
}

/** Symbol or code once, in the en-US narrow-symbol place. */
function paintMoney(body: string, currency: string): string {
  try {
    const parts = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(1);
    const painted = parts
      .filter(
        (part) =>
          part.type !== "decimal" &&
          part.type !== "fraction" &&
          part.type !== "group",
      )
      .map((part) => (part.type === "integer" ? body : part.value))
      .join("");
    if (painted.includes(body)) return painted;
  } catch {
    // An unknown code still has to show which currency the amount is.
  }
  return `${currency} ${body}`;
}

/** Channel salary, or null when both bounds are missing (D389). */
export function jobsAlertSalaryLine(row: JobsAlertRow): string | null {
  if (row.salaryMin === null && row.salaryMax === null) return null;
  const currency = jobsAlertCurrency(row.salaryCurrency);
  const period = isPeriod(row.salaryPeriod) ? row.salaryPeriod : "month";
  const basis = isBasis(row.salaryBasis) ? row.salaryBasis : "gross";
  const token = (amount: bigint) =>
    jobsAlertAmountToken(amount, currency, period, basis);
  const min = row.salaryMin === null ? "" : token(row.salaryMin);
  const max = row.salaryMax === null ? "" : token(row.salaryMax);
  const body = min && max ? `${min}-${max}` : min || max;
  return `💰 ${paintMoney(body, currency)}/${period}`;
}

function jobsAlertRelative(elapsed: number): string {
  if (elapsed < MINUTE_MS) return "just now";
  if (elapsed < HOUR_MS) {
    const minutes = Math.floor(elapsed / MINUTE_MS);
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }
  if (elapsed < DAY_MS) {
    const hours = Math.floor(elapsed / HOUR_MS);
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }
  const days = Math.floor(elapsed / DAY_MS);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

/** Send-time freshness. No timestamp → no line (D389). */
export function jobsAlertFreshnessLine(
  publishedAt: Date | null,
  now: Date,
): string | null {
  if (
    !publishedAt ||
    Number.isNaN(publishedAt.getTime()) ||
    Number.isNaN(now.getTime())
  ) {
    return null;
  }
  const elapsed = Math.max(0, now.getTime() - publishedAt.getTime());
  const relative = jobsAlertRelative(elapsed);
  const label =
    elapsed < DAY_MS ? `New! Posted ${relative}` : `Posted ${relative}`;
  return `💥 ${label}`;
}

/** Fixed English channel card. No description, no skills, no LLM (D341, D389). */
export function jobsAlertText(row: JobsAlertRow, now: Date = new Date()): string {
  const lines = [
    `💼 ${jobsAlertSingleLine(row.title)}`,
    `🏛️ at ${jobsAlertSingleLine(row.companyName)}`,
    `🌍 ${jobsAlertPlace(row)}`,
  ];
  const salary = jobsAlertSalaryLine(row);
  if (salary) lines.push(salary);
  const freshness = jobsAlertFreshnessLine(row.firstPublishedAt, now);
  if (freshness) lines.push(freshness);
  lines.push(`✅ Apply → https://intgetion.com/jobs/${row.id}`, "");
  lines.push("Or forward to a friend!");
  return lines.join("\n");
}

export function isJobsAlertCandidate(input: {
  status: string;
  sentAt: Date | null;
  firstPublishedAt: Date | null;
  watermark: Date | null;
  remotive: boolean;
  host: string;
}): boolean {
  if (input.status !== "published" || input.sentAt) return false;
  if (!input.firstPublishedAt || !input.watermark) return false;
  if (input.firstPublishedAt < input.watermark) return false;
  if (isIntgetionHost(input.host) && input.remotive) return false;
  return true;
}

type Claimed = {
  id: string;
  title: string;
  company_name: string;
  status: string;
  salary_min: string | null;
  salary_max: string | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_basis: string | null;
  work_format: string | null;
  location: string | null;
  location_country: string | null;
  first_published_at: Date | string | null;
};

function publishedAtOf(value: Date | string | null): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toRow(row: Claimed): JobsAlertRow {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company_name,
    salaryMin: row.salary_min === null ? null : BigInt(row.salary_min),
    salaryMax: row.salary_max === null ? null : BigInt(row.salary_max),
    salaryCurrency: row.salary_currency,
    salaryPeriod: row.salary_period,
    salaryBasis: row.salary_basis,
    workFormat: row.work_format,
    location: row.location,
    locationCountry: row.location_country,
    firstPublishedAt: publishedAtOf(row.first_published_at),
  };
}

/**
 * Locks one eligible job, sends, and stamps only on "sent".
 * The caller passes ids already failed in this tick so they wait for the next one.
 */
export async function deliverJobsAlert(input: {
  chatId: number;
  sender: TelegramSender;
  host: string;
  exclude: readonly string[];
}): Promise<{ status: JobsAlertDelivery; id?: string }> {
  const blockRemotive = isIntgetionHost(input.host);
  const excludeClause =
    input.exclude.length === 0
      ? sql`true`
      : sql`j.id not in (${sql.join(
          input.exclude.map((id) => sql`${id}::uuid`),
          sql`, `,
        )})`;
  return getDb().transaction(async (tx) => {
    const claimed = await tx.execute<Claimed>(sql`
      select j.id, j.title, j.status, c.name as company_name,
             j.salary_min::text as salary_min,
             j.salary_max::text as salary_max,
             j.salary_currency, j.salary_period::text as salary_period,
             j.salary_basis::text as salary_basis,
             j.work_format::text as work_format,
             j.location,
             j.location_country,
             (
               select min(h.created_at)
               from public.job_status_history h
               where h.job_id = j.id and h.to_status = 'published'
             ) as first_published_at
      from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.status = 'published'
        and j.jobs_alert_sent_at is null
        and ${excludeClause}
        and (
          select min(h.created_at)
          from public.job_status_history h
          where h.job_id = j.id and h.to_status = 'published'
        ) >= (
          select m.applied_at
          from public.schema_migrations m
          where m.filename = ${JOBS_ALERT_MIGRATION}
        )
        and not (
          ${blockRemotive}
          and exists (
            select 1
            from public.job_sources s
            join public.import_sources i on i.id = s.import_source_id
            where s.job_id = j.id and i.name = 'Remotive'
          )
        )
      order by (
        select min(h.created_at)
        from public.job_status_history h
        where h.job_id = j.id and h.to_status = 'published'
      )
      limit 1
      for update of j skip locked
    `);
    const row = claimed[0];
    if (!row || row.status !== "published") return { status: "empty" };
    const result = await input.sender(
      input.chatId,
      jobsAlertText(toRow(row), new Date()),
    );
    if (result !== "sent") return { status: "failed", id: row.id };
    await tx.execute(sql`
      update public.jobs
      set jobs_alert_sent_at = now()
      where id = ${row.id}
    `);
    return { status: "sent" };
  });
}

export async function runJobsAlert(input: {
  sender: TelegramSender;
  host: string;
  chatIdRaw?: string;
  deliver?: (exclude: readonly string[]) => Promise<{
    status: JobsAlertDelivery;
    id?: string;
  }>;
}): Promise<{ disabled: true } | { sent: number; failed: number }> {
  const chatId = parseJobsAlertChatId(input.chatIdRaw);
  if (chatId === null) return { disabled: true };
  const deliver =
    input.deliver ??
    ((exclude: readonly string[]) =>
      deliverJobsAlert({
        chatId,
        sender: input.sender,
        host: input.host,
        exclude,
      }));
  const exclude: string[] = [];
  let sent = 0;
  let failed = 0;
  for (let n = 0; n < BATCH; n += 1) {
    let outcome: { status: JobsAlertDelivery; id?: string };
    try {
      outcome = await deliver(exclude);
    } catch {
      failed += 1;
      break;
    }
    if (outcome.status === "empty") break;
    if (outcome.status === "sent") {
      sent += 1;
      continue;
    }
    failed += 1;
    if (outcome.id) exclude.push(outcome.id);
  }
  return { sent, failed };
}
