import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { formatMoneyDto } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/ui/job-card";
import type { searchJobs } from "../service";

type PublicJob = Awaited<ReturnType<typeof searchJobs>>["items"][number];

export async function PublicJobCard({
  job,
  locale,
  extraBadges,
  actions,
}: {
  job: PublicJob;
  locale: string;
  /** e.g. the match percent on /matches (6B) */
  extraBadges?: ReactNode;
  actions?: ReactNode;
}) {
  const t = await getTranslations("jobs");
  const money = locale === "ru" ? "ru-RU" : "en-US";
  const salary = job.salaryMin
    ? `${formatMoneyDto(job.salaryMin, money)}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""} / ${t(job.salaryMin.period)}`
    : t("salaryMissing");
  return (
    <JobCard
      href={`/jobs/${job.id}`}
      title={job.title}
      transitionName={`job-title-${job.id}`}
      category={t(job.employmentType)}
      companyName={job.company.name}
      companyHref={`/companies/${job.company.slug}`}
      badges={
        <>
          {extraBadges}
          <Badge>{t(job.workFormat)}</Badge>
          {job.company.isTrusted ? (
            <Badge tone="trusted">{t("trusted")}</Badge>
          ) : null}
          {job.source.type === "imported" ? (
            <Badge tone="imported">{t("imported")}</Badge>
          ) : null}
        </>
      }
      stats={[
        { label: t("salaryMin"), value: salary, muted: !job.salaryMin },
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
      actions={actions}
    />
  );
}
