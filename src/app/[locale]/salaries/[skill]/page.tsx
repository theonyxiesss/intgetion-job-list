import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navBack } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import {
  getSkillSalary,
  MIN_JOBS_PER_ROW,
  MIN_JOBS_PER_SKILL,
  WINDOW_DAYS,
} from "@/modules/salaries/service";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { formatUsd } from "../format";
import { localePrefix } from "@/i18n/paths";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; skill: string }>;
}): Promise<Metadata> {
  const { locale, skill: slug } = await params;
  const found = await getSkillSalary(slug);
  if (!found) return {};
  const t = await getTranslations({ locale, namespace: "salaries" });
  const skill = locale === "ru" ? found.skill.nameRu : found.skill.nameEn;
  const title = t("skillTitle", { skill });
  const description = found.stats
    ? t("skillIntro", {
        skill,
        count: found.stats.jobCount,
        days: WINDOW_DAYS,
      })
    : undefined;
  return {
    title,
    ...(description ? { description } : {}),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/salaries/${slug}`,
      languages: languageAlternates(`/salaries/${slug}`),
    },
    openGraph: { type: "website", title, description },
    // Thin data: reachable, but kept out of the index (D260).
    ...(found.stats ? {} : { robots: { index: false } }),
  };
}

export default async function SkillSalaryPage({
  params,
}: {
  params: Promise<{ locale: string; skill: string }>;
}) {
  const { locale, skill: slug } = await params;
  setRequestLocale(locale);
  const found = await getSkillSalary(slug);
  if (!found) notFound();
  const t = await getTranslations("salaries");
  const skill = locale === "ru" ? found.skill.nameRu : found.skill.nameEn;
  const { stats } = found;
  const jobsLink = (
    <Link
      className={buttonClass("secondary")}
      href={`/jobs?q=${encodeURIComponent(skill)}`}
    >
      {t("skillJobs", { skill })}
    </Link>
  );

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <Link
          href="/salaries"
          {...navBack}
          className="t-label self-start text-fg-muted"
        >
          {t("allSalaries")}
        </Link>
        {stats ? (
          <>
            <PageHeader
              title={t("skillTitle", { skill })}
              intro={t("skillIntro", {
                skill,
                count: stats.jobCount,
                days: WINDOW_DAYS,
              })}
              actions={jobsLink}
            />
            <dl>
              <StatRow>
                <Stat label={t("p25")} value={formatUsd(stats.p25, locale)} />
                <Stat
                  label={t("median")}
                  value={formatUsd(stats.median, locale)}
                  large
                />
                <Stat label={t("p75")} value={formatUsd(stats.p75, locale)} />
              </StatRow>
            </dl>
            <p className="t-label text-fg-muted">{t("perYear")}</p>
            {stats.bySeniority.length ? (
              <section className="flex flex-col gap-4">
                <h2 className="t-h3">{t("bySeniority")}</h2>
                <Table caption={t("bySeniority")}>
                  <thead>
                    <tr>
                      <Th>{t("bySeniority")}</Th>
                      <Th numeric>{t("jobs")}</Th>
                      <Th numeric>{t("p25")}</Th>
                      <Th numeric>{t("median")}</Th>
                      <Th numeric>{t("p75")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.bySeniority.map((row) => (
                      <Tr key={row.seniority}>
                        <Td>{t(`seniority.${row.seniority}`)}</Td>
                        <Td numeric>{row.jobCount}</Td>
                        <Td numeric>{formatUsd(row.p25, locale)}</Td>
                        <Td numeric>{formatUsd(row.median, locale)}</Td>
                        <Td numeric>{formatUsd(row.p75, locale)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </section>
            ) : null}
          </>
        ) : (
          <>
            <PageHeader title={t("skillTitle", { skill })} />
            <EmptyState
              title={t("skillEmptyTitle", { skill })}
              text={t("emptyText", { min: MIN_JOBS_PER_SKILL })}
              action={jobsLink}
            />
          </>
        )}
        <p className="t-body-s max-w-[68ch] text-fg-muted">
          {t("method", { min: MIN_JOBS_PER_SKILL, row: MIN_JOBS_PER_ROW })}
        </p>
      </Container>
    </main>
  );
}
