import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { navForward } from "@/components/ui/page-transition";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import {
  getSalaryOverview,
  MIN_JOBS_PER_ROW,
  MIN_JOBS_PER_SKILL,
  WINDOW_DAYS,
} from "@/modules/salaries/service";
import { languageAlternates, siteUrl } from "@/modules/seo/site";
import { formatUsd } from "./format";

// Numbers move with every published job (D260).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "salaries" });
  const overview = await getSalaryOverview();
  const description = t("intro", { days: WINDOW_DAYS });
  return {
    title: t("title"),
    description,
    alternates: {
      canonical: `${siteUrl()}/${locale}/salaries`,
      languages: languageAlternates("/salaries"),
    },
    openGraph: { type: "website", title: t("title"), description },
    // An empty page is not worth indexing (D260).
    ...(overview.length === 0 ? { robots: { index: false } } : {}),
  };
}

export default async function SalariesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("salaries");
  const overview = await getSalaryOverview();

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          intro={t("intro", { days: WINDOW_DAYS })}
        />
        {overview.length ? (
          <Table caption={t("title")}>
            <thead>
              <tr>
                <Th>{t("skill")}</Th>
                <Th numeric>{t("jobs")}</Th>
                <Th numeric>{t("p25")}</Th>
                <Th numeric>{t("median")}</Th>
                <Th numeric>{t("p75")}</Th>
              </tr>
            </thead>
            <tbody>
              {overview.map(({ stats, skill }) => (
                <Tr key={skill.slug}>
                  <Td>
                    <Link href={`/salaries/${skill.slug}`} {...navForward}>
                      {locale === "ru" ? skill.nameRu : skill.nameEn}
                    </Link>
                  </Td>
                  <Td numeric>{stats.jobCount}</Td>
                  <Td numeric>{formatUsd(stats.p25, locale)}</Td>
                  <Td numeric>{formatUsd(stats.median, locale)}</Td>
                  <Td numeric>{formatUsd(stats.p75, locale)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState
            title={t("emptyTitle")}
            text={t("emptyText", { min: MIN_JOBS_PER_SKILL })}
            action={
              <Link className={buttonClass("secondary")} href="/jobs">
                {t("browseJobs")}
              </Link>
            }
          />
        )}
        <p className="t-body-s max-w-[68ch] text-fg-muted">
          {t("method", { min: MIN_JOBS_PER_SKILL, row: MIN_JOBS_PER_ROW })}
        </p>
      </Container>
    </main>
  );
}
