import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import type { SalaryBasis, SalaryPeriod } from "@/lib/money";
import { formatMoneyDto, toMoneyDto } from "@/lib/money";
import type { TelegramSender } from "@/lib/telegram-bot";
import ru from "@/messages/ru.json";

/** This file's applied_at is the watermark (D341). */
export const JOBS_ALERT_MIGRATION = "0033_jobs_alert.sql";

const BATCH = 20;

const PERIOD_LABEL: Record<SalaryPeriod, string> = {
  hour: ru.jobs.hour,
  month: ru.jobs.month,
  year: ru.jobs.year,
};

export type JobsAlertRow = {
  id: string;
  title: string;
  companyName: string;
  salaryMin: bigint | null;
  salaryMax: bigint | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryBasis: string | null;
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

/** One line of the template. A line break in the source would add a fourth line. */
export function jobsAlertSingleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ");
}

function isPeriod(value: string | null): value is SalaryPeriod {
  return value === "hour" || value === "month" || value === "year";
}

function isBasis(value: string | null): value is SalaryBasis {
  return value === "gross" || value === "net";
}

/** Employer currency, or USD when the job did not name one (D341). */
export function jobsAlertCurrency(raw: string | null): string {
  const code = raw?.trim().toUpperCase() ?? "";
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

export function jobsAlertSalaryLine(row: JobsAlertRow): string {
  if (row.salaryMin === null && row.salaryMax === null) {
    return "Зарплата: не указана";
  }
  const currency = jobsAlertCurrency(row.salaryCurrency);
  const period = isPeriod(row.salaryPeriod) ? row.salaryPeriod : "month";
  const basis = isBasis(row.salaryBasis) ? row.salaryBasis : "gross";
  const format = (amount: bigint) =>
    formatMoneyDto(toMoneyDto(amount, currency, period, basis), "ru-RU");
  const min = row.salaryMin === null ? "" : format(row.salaryMin);
  const max = row.salaryMax === null ? "" : format(row.salaryMax);
  const amount = min && max ? `${min} – ${max}` : min || max;
  const periodLabel = isPeriod(row.salaryPeriod)
    ? ` / ${PERIOD_LABEL[row.salaryPeriod]}`
    : "";
  return `Зарплата: ${amount}${periodLabel}`;
}

/** Fixed channel text. No description, no skills, no LLM (D341). */
export function jobsAlertText(row: JobsAlertRow): string {
  return [
    `Вакансия: ${jobsAlertSingleLine(row.title)}`,
    `Компания: ${jobsAlertSingleLine(row.companyName)}`,
    jobsAlertSalaryLine(row),
    "",
    `https://intgetion.com/ru/jobs/${row.id}`,
  ].join("\n");
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
};

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
             j.salary_basis::text as salary_basis
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
    const result = await input.sender(input.chatId, jobsAlertText(toRow(row)));
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
