import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { CompanyMarkFor } from "@/components/ui/company-mark";
import { JobCard } from "@/components/ui/job-card";
import { formatMoneyDto } from "@/lib/money";
import type { MatchCard } from "../service";
import { DismissButton, type DismissText } from "./dismiss-button";
import { ExplainLines } from "./explain-lines";
import { intlLocale } from "@/i18n/locale";

export async function MatchCardView({
  card,
  locale,
  dismiss,
  isNew,
}: {
  card: MatchCard;
  locale: string;
  dismiss: DismissText;
  isNew: boolean;
}) {
  const t = await getTranslations("jobs");
  const matches = await getTranslations("matches");
  const categories = await getTranslations("categories");
  const matchesNew = matches("new");
  const money = intlLocale(locale);
  const { job } = card;
  const salary = job.salaryMin
    ? `${formatMoneyDto(job.salaryMin, money)}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""} / ${t(job.salaryMin.period)}`
    : t("salaryMissing");
  return (
    <div className="flex flex-col gap-3">
      <JobCard
        href={`/jobs/${job.id}`}
        title={job.title}
        transitionName={`job-title-${job.id}`}
        category={categories(job.category as "engineering")}
        companyName={job.company.name}
        companyHref={`/companies/${job.company.slug}`}
        mark={
          <CompanyMarkFor
            company={job.company}
            className="pointer-events-none"
          />
        }
        badges={
          <>
            <span className="t-data text-signal">{`${Math.round(card.score * 100)}%`}</span>
            <Badge>{t(job.workFormat)}</Badge>
            {isNew ? <Badge tone="new">{matchesNew}</Badge> : null}
            {job.company.isTrusted ? (
              <Badge tone="trusted">{t("trusted")}</Badge>
            ) : null}
          </>
        }
        stats={[
          {
            label: t("salaryMin"),
            value: salary,
            muted: !job.salaryMin,
            lead: true,
          },
          {
            label: t("timezone"),
            value: job.timezoneRequired
              ? `${job.timezoneRequired} · ${job.minOverlapHours}h`
              : t("worldwide"),
            muted: !job.timezoneRequired,
          },
        ]}
        skills={job.skills.map((skill) => skill.name)}
        moreSkillsLabel={(hidden) => `+${hidden + job.skillsMore}`}
        actions={<DismissButton jobId={job.id} text={dismiss} />}
      />
      <ExplainLines entries={card.explain} />
    </div>
  );
}
