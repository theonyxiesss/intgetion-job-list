import { getTranslations } from "next-intl/server";
import { sectorsForCard } from "@/config/markers";
import { formatMoneyDto } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/ui/job-card";
import type { searchJobs } from "../service";

type PublicJob = Awaited<ReturnType<typeof searchJobs>>["items"][number];

/** Plain first lines of the description; the card clamps it to two lines. */
function summaryOf(description: string | null): string | null {
  if (!description) return null;
  const plain = description
    .replace(/<[^>]*>/g, " ")
    .replace(/[#*_`>[\]]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain ? plain.slice(0, 240) : null;
}

export async function PublicJobCard({
  job,
  locale,
}: {
  job: PublicJob;
  locale: string;
}) {
  const t = await getTranslations("jobs");
  const markers = await getTranslations("markers");
  const categories = await getTranslations("categories");
  const money = locale === "ru" ? "ru-RU" : "en-US";
  const published = job.publishedAt
    ? new Intl.DateTimeFormat(money, { day: "numeric", month: "short" }).format(
        new Date(job.publishedAt),
      )
    : null;
  const meta = [
    job.location?.trim() || job.locationCountry || t("worldwide"),
    t(job.workFormat),
    ...(published ? [published] : []),
  ];
  const salary = job.salaryMin
    ? `${formatMoneyDto(job.salaryMin, money)}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""} / ${t(job.salaryMin.period)}`
    : t("salaryMissing");
  return (
    <JobCard
      href={`/jobs/${job.id}`}
      title={job.title}
      transitionName={`job-title-${job.id}`}
      category={categories(job.category)}
      companyName={job.company.name}
      companyHref={`/companies/${job.company.slug}`}
      badges={
        <>
          {sectorsForCard(job.sectors).map((sector) => (
            <Badge key={sector}>{markers(`sectors.${sector}`)}</Badge>
          ))}
          {job.perks.includes("crypto-pay") ? (
            <Badge tone="new">{markers("perks.crypto-pay")}</Badge>
          ) : null}
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
          label: markers("seniorityLabel"),
          value: job.seniority
            ? markers(`seniority.${job.seniority}`)
            : t("any"),
          muted: !job.seniority,
        },
        {
          label: t("timezone"),
          value: job.timezoneRequired
            ? `${job.timezoneRequired} · ${job.minOverlapHours}h`
            : t("worldwide"),
          muted: !job.timezoneRequired,
        },
      ]}
      tagLimit={3}
      skills={[
        ...job.skills.map((skill) => skill.name),
        ...job.perks
          .filter((perk) => perk !== "crypto-pay")
          .map((perk) => markers(`perks.${perk}`)),
      ]}
      moreSkillsLabel={(hidden) => `+${hidden + job.skillsMore}`}
      meta={meta}
      summary={summaryOf(job.description)}
      viewLabel={t("viewJob")}
    />
  );
}
