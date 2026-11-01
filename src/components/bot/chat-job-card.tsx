"use client";

import { useLocale, useTranslations } from "next-intl";
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
}: {
  job: ChatJob;
  text: ChatJobCardText;
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
