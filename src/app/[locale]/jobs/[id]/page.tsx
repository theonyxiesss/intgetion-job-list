import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatMoneyDto } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/ui/container";
import { Morph, navBack, navForward } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { isJobSavedForUser } from "@/modules/feedback/service";
import { ExternalApplyLink } from "@/modules/feedback/ui/external-apply-link";
import { JobFeedbackActions } from "@/modules/feedback/ui/job-feedback-actions";
import { getJobForPublic } from "@/modules/jobs/service";
import { WhyItFits } from "@/modules/matching/ui/why-it-fits";
import { jobPostingJsonLd } from "@/modules/seo/job-posting";
import { JsonLd } from "@/modules/seo/json-ld";
import { breadcrumbListJsonLd, importedJobSummary } from "@/modules/seo/markup";
import {
  languageAlternates,
  metaDescription,
  siteUrl,
} from "@/modules/seo/site";
import { RememberViewedJob } from "@/modules/jobs/ui/remember-viewed-job";
import { ShareJob } from "@/modules/jobs/ui/share-job";
import { SimilarJobs } from "@/modules/jobs/ui/similar-jobs";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import { localePrefix } from "@/i18n/paths";
import { intlLocale } from "@/i18n/locale";

export const dynamic = "force-dynamic";

/** Title, description, canonical and share card for search (D211). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const job = await getJobForPublic(id, { locale });
  if (!job) return {};
  const title = `${job.title} — ${job.company.name}`;
  const description = metaDescription(job.description);
  return {
    title,
    description,
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/jobs/${job.id}`,
      languages: languageAlternates(`/jobs/${job.id}`),
    },
    openGraph: { type: "website", title, description },
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const seo = await getTranslations("seo");
  const actions = await getTranslations("jobActions");
  const categories = await getTranslations("categories");
  const job = await getJobForPublic(id, { locale });
  if (!job) notFound();
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const initialSaved = user ? await isJobSavedForUser(user.id, job.id) : false;
  const money = intlLocale(locale);
  const salary = job.salaryMin
    ? `${formatMoneyDto(job.salaryMin, money)}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""} / ${t(job.salaryMin.period)} (${t(job.salaryMin.basis)})`
    : t("salaryMissing");
  const source = job.company.isTrusted
    ? t("trusted")
    : job.source.type === "imported"
      ? `${t("importedFrom")} ${job.source.name ?? ""}`
      : t("company");

  return (
    <main className="py-10 md:py-16">
      <RememberViewedJob jobId={job.id} />
      {/* Our own published jobs only: imported ones belong to their source,
          and feeds such as Remotive forbid passing them to Google Jobs (D211). */}
      {job.source.type === "internal" ? (
        <JsonLd data={jobPostingJsonLd(job, siteUrl(), locale)} />
      ) : null}
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}${localePrefix(locale)}` },
          {
            name: seo("jobs"),
            url: `${siteUrl()}${localePrefix(locale)}/jobs`,
          },
          {
            name: job.title,
            url: `${siteUrl()}${localePrefix(locale)}/jobs/${job.id}`,
          },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <Link
          href="/jobs"
          {...navBack}
          className="t-label self-start text-fg-muted"
        >
          {t("backToJobs")}
        </Link>
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <article className="flex flex-col gap-8 pb-28 lg:pb-0">
            <header className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="t-label text-fg-muted">
                  {categories(job.category as "engineering")}
                </p>
                <Badge>{t(job.workFormat)}</Badge>
                <Badge>{t(job.employmentType)}</Badge>
              </div>
              <Morph name={`job-title-${job.id}`}>
                <h1 className="t-display-l">{job.title}</h1>
              </Morph>
              <Link
                href={`/companies/${job.company.slug}`}
                {...navForward}
                className="t-body-s self-start text-fg-muted underline-offset-4 hover:underline"
              >
                {job.company.name}
              </Link>
              {job.publishedAt ? (
                <time
                  dateTime={job.publishedAt}
                  className="t-data text-fg-muted"
                >
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                  }).format(new Date(job.publishedAt))}
                </time>
              ) : null}
              <p className="t-label text-fg-muted">{source}</p>
            </header>
            <StatRow>
              <Stat
                label={t("salaryMin")}
                value={salary}
                muted={!job.salaryMin}
              />
              <Stat label={t("format")} value={t(job.workFormat)} />
              <Stat
                label={t("timezone")}
                value={
                  job.timezoneRequired
                    ? `${job.timezoneRequired} · ${job.minOverlapHours}h`
                    : t("worldwide")
                }
                muted={!job.timezoneRequired}
              />
              <Stat label={t("employment")} value={t(job.employmentType)} />
            </StatRow>
            {job.source.type === "imported" ? (
              <section className="flex flex-col gap-4 border border-line p-4">
                <h2 className="t-h3">{seo("inOurWords")}</h2>
                <p className="max-w-[68ch]">
                  {importedJobSummary({
                    title: job.title,
                    company: job.company.name,
                    format: t(job.workFormat),
                    employment: t(job.employmentType),
                    timezone: job.timezoneRequired
                      ? `${job.timezoneRequired} · ${job.minOverlapHours}h`
                      : t("worldwide"),
                    salary,
                    skills: job.skills.map((skill) => skill.name),
                  })}
                </p>
                <div className="flex flex-col gap-1 border border-line p-4">
                  <p className="t-label text-fg-muted">{t("company")}</p>
                  <Link
                    href={`/companies/${job.company.slug}`}
                    {...navForward}
                    className="t-body-s self-start underline-offset-4 hover:underline"
                  >
                    {job.company.name}
                  </Link>
                </div>
                {job.source.url ? (
                  <a
                    href={job.source.url}
                    rel="noopener noreferrer"
                    className="t-body-s self-start underline-offset-4 hover:underline"
                  >
                    {seo("originalOn", { source: job.source.name ?? "" })}
                  </a>
                ) : null}
              </section>
            ) : null}
            <div className="t-body-l max-w-[68ch] whitespace-pre-wrap">
              {job.description}
            </div>
            {job.skills.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <li key={skill.id}>
                    <Badge>{skill.name}</Badge>
                  </li>
                ))}
                {job.skillsMore > 0 ? (
                  <li>
                    <Badge>{`+${job.skillsMore}`}</Badge>
                  </li>
                ) : null}
              </ul>
            ) : null}
            {job.languages.length > 0 ? (
              <p className="t-body-s text-fg-muted">
                {job.languages
                  .map((language) => `${language.lang} ${language.minLevel}`)
                  .join(" · ")}
              </p>
            ) : null}
          </article>
          <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg p-4 lg:sticky lg:top-24 lg:border lg:p-5">
            <div className="flex flex-col gap-3">
              {job.applicationUrl &&
              job.applicationMethod === "external_url" ? (
                <ExternalApplyLink
                  jobId={job.id}
                  href={job.applicationUrl}
                  label={t("apply")}
                />
              ) : null}
              {user ? (
                <JobFeedbackActions
                  jobId={job.id}
                  initialSaved={initialSaved}
                  text={{
                    save: actions("save"),
                    saved: actions("saved"),
                    unsave: actions("unsave"),
                    saveError: actions("saveError"),
                    hide: actions("hide"),
                    hideTitle: actions("hideTitle"),
                    hideScopeJob: actions("hideScopeJob"),
                    hideScopeCompany: actions("hideScopeCompany"),
                    reasonLabel: actions("reasonLabel"),
                    reasonNone: actions("reasonNone"),
                    confirm: actions("confirm"),
                    cancel: actions("cancel"),
                    hideError: actions("hideError"),
                    report: actions("report"),
                    reportTitle: actions("reportTitle"),
                    detailsLabel: actions("detailsLabel"),
                    reportSuccess: actions("reportSuccess"),
                    alreadyReported: actions("alreadyReported"),
                    rateLimited: actions("rateLimited"),
                    reportError: actions("reportError"),
                    hideReasons: {
                      salary: actions("reasons.salary"),
                      format: actions("reasons.format"),
                      timezone: actions("reasons.timezone"),
                      company: actions("reasons.company"),
                      role: actions("reasons.role"),
                      other: actions("reasons.other"),
                    },
                    reportReasons: {
                      scam: actions("reportReasons.scam"),
                      spam: actions("reportReasons.spam"),
                      fake_company: actions("reportReasons.fake_company"),
                      discrimination: actions("reportReasons.discrimination"),
                      wrong_info: actions("reportReasons.wrong_info"),
                      inappropriate: actions("reportReasons.inappropriate"),
                      other: actions("reportReasons.other"),
                    },
                  }}
                />
              ) : null}
              {user ? <WhyItFits userId={user.id} jobId={job.id} /> : null}
              <div className="hidden lg:block">
                <ShareJob
                  url={`${siteUrl()}${localePrefix(locale)}/jobs/${job.id}`}
                  title={job.title}
                  text={{
                    title: t("share.title"),
                    copy: t("share.copy"),
                    copied: t("share.copied"),
                    more: t("share.more"),
                  }}
                />
              </div>
            </div>
          </aside>
        </div>
        <div className="lg:hidden">
          <ShareJob
            url={`${siteUrl()}${localePrefix(locale)}/jobs/${job.id}`}
            title={job.title}
            text={{
              title: t("share.title"),
              copy: t("share.copy"),
              copied: t("share.copied"),
              more: t("share.more"),
            }}
          />
        </div>
        <SimilarJobs
          job={job}
          locale={locale}
          viewer={{
            hidden: user ? await getHiddenSetsForViewer(user.id) : null,
          }}
        />
      </Container>
    </main>
  );
}
