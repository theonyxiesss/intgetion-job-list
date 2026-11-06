"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { handSpokiAsk } from "@/components/bot/spoki-ask";
import { Badge } from "@/components/ui/badge";
import { CompanyMark } from "@/components/ui/company-mark";
import { JobCard, type JobCardStat } from "@/components/ui/job-card";
import { intlLocale } from "@/i18n/locale";
import { companyLogoSrc } from "@/lib/company-mark";
import { formatMoneyDto, type MoneyDto } from "@/lib/money";

type ExplainLine = {
  detail: { key: string; params: Record<string, string | number> };
};

/** What search_jobs, get_job and get_matches send to the web chat (D377). */
export type ChatJob = {
  id: string;
  title: string;
  companyName: string;
  company?: { id: string; slug: string; logoPath: string | null };
  workFormat: string;
  location?: string | null;
  locationCountry?: string | null;
  salaryMin?: MoneyDto | null;
  salaryMax?: MoneyDto | null;
  score?: number;
  explain?: ExplainLine[];
};

/**
 * Card labels from the `jobs` namespace. That namespace is not sent to every
 * page (D41b), so the chat page reads these on the server and passes them in.
 */
export type ChatJobCardText = {
  salary: string;
  worldwide: string;
  viewJob: string;
  formats: Record<"remote" | "hybrid" | "onsite", string>;
  periods: Record<"hour" | "month" | "year", string>;
};

/**
 * The catalog card in its narrow form: company mark, salary when the job
 * has one, place and format. No "imported" badge (D376).
 */
export function ChatJobCard({
  job,
  text,
  withActions = false,
}: {
  job: ChatJob;
  text: ChatJobCardText;
  /** The chat home's buttons under the card (TZ 53). */
  withActions?: boolean;
}) {
  const chat = useTranslations("chat");
  const explain = useTranslations("explain");
  const money = intlLocale(useLocale());
  const stats: JobCardStat[] = [];
  if (job.salaryMin) {
    const max = job.salaryMax
      ? ` – ${formatMoneyDto(job.salaryMax, money)}`
      : "";
    stats.push({
      label: text.salary,
      value: `${formatMoneyDto(job.salaryMin, money)}${max} / ${text.periods[job.salaryMin.period]}`,
      lead: true,
    });
  }
  const meta = [
    job.location?.trim() || job.locationCountry || text.worldwide,
    ...(job.workFormat in text.formats
      ? [text.formats[job.workFormat as keyof ChatJobCardText["formats"]]]
      : []),
  ];
  return (
    // Under the 640px container breakpoint, so the card always takes its
    // narrow layout in the chat column (D377).
    <div className="flex w-full max-w-[36rem] flex-col gap-2">
      <JobCard
        compact
        href={`/jobs/${job.id}`}
        title={job.title}
        companyName={job.companyName}
        companyHref={job.company ? `/companies/${job.company.slug}` : undefined}
        mark={
          job.company ? (
            // No view-transition name: the same company can sit on several
            // cards in one conversation, and the names must be unique.
            <CompanyMark
              companyId={job.company.id}
              src={companyLogoSrc(job.company.slug, job.company.logoPath)}
              className="pointer-events-none"
            />
          ) : undefined
        }
        badges={
          job.score !== undefined ? (
            <Badge tone="new">
              {chat("score", { score: Math.round(job.score * 100) })}
            </Badge>
          ) : undefined
        }
        stats={stats}
        meta={meta}
        viewLabel={text.viewJob}
      />
      {job.explain?.slice(0, 3).map((line) => (
        <p key={line.detail.key} className="t-body-s px-1 text-fg-subtle">
          {explain(
            line.detail.key.replace(/^explain\./, ""),
            line.detail.params,
          )}
        </p>
      ))}
      {withActions ? <JobCardActions job={job} /> : null}
    </div>
  );
}

type Details =
  { state: "loading" | "error" } | { state: "ready"; text: string };

/**
 * Opens the job's description in place and hands the next step to the chat:
 * saving, applying and the cover letter go through the bot's own tools and
 * its confirmation card (TZ 53).
 */
function JobCardActions({ job }: { job: ChatJob }) {
  const t = useTranslations("chat.jobCard");
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const subject = { title: job.title, company: job.companyName, id: job.id };

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (!next || details?.state === "ready") return;
    setDetails({ state: "loading" });
    try {
      const response = await fetch(`/api/jobs/${job.id}`);
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as {
        job: { description?: string | null };
      };
      setDetails({ state: "ready", text: body.job.description?.trim() ?? "" });
    } catch {
      setDetails({ state: "error" });
    }
  }

  const button =
    "inline-flex min-h-11 items-center rounded-full border border-line px-4 t-body-s transition-colors hover:bg-surface-2";
  return (
    <div className="flex flex-col gap-2 px-1">
      {open ? (
        <div className="rounded-2xl border border-line bg-surface px-4 py-3">
          {details?.state === "ready" ? (
            <p className="t-body-s max-h-80 overflow-y-auto whitespace-pre-line text-fg">
              {details.text || t("empty")}
            </p>
          ) : (
            <p className="t-body-s text-fg-muted" role="status">
              {details?.state === "error" ? t("error") : t("loading")}
            </p>
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={button}
          aria-expanded={open}
          onClick={() => void toggle()}
        >
          {open ? t("less") : t("more")}
        </button>
        <button
          type="button"
          className={button}
          onClick={() => handSpokiAsk(t("askSave", subject))}
        >
          {t("save")}
        </button>
        <button
          type="button"
          className={button}
          onClick={() => handSpokiAsk(t("askLetter", subject))}
        >
          {t("letter")}
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 items-center rounded-full bg-fg px-4 t-body-s text-bg"
          onClick={() => handSpokiAsk(t("askApply", subject))}
        >
          {t("apply")}
        </button>
      </div>
    </div>
  );
}

/**
 * The card labels from the `jobs` namespace messages (D377). Used where the
 * namespace is already loaded on the client, such as the Spoki panel.
 */
export function cardTextOf(
  jobs: Partial<Record<string, unknown>>,
): ChatJobCardText {
  const label = (key: string) => String(jobs[key] ?? "");
  return {
    salary: label("salaryMin"),
    worldwide: label("worldwide"),
    viewJob: label("viewJob"),
    formats: {
      remote: label("remote"),
      hybrid: label("hybrid"),
      onsite: label("onsite"),
    },
    periods: {
      hour: label("hour"),
      month: label("month"),
      year: label("year"),
    },
  };
}
