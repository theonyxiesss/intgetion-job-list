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

export default async function JobPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const actions = await getTranslations("jobActions");
  const job = await getJobForPublic(id, { locale });
  if (!job) notFound();
  const supabase = await createSupabaseServerClient();
  const user = await getCurrentUser(supabase.auth);
  const initialSaved = user ? await isJobSavedForUser(user.id, job.id) : false;
  const money = locale === "ru" ? "ru-RU" : "en-US";
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
              <p className="t-label text-fg-muted">{source}</p>
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
              <div className="flex flex-wrap gap-2">
                <Badge>{t(job.workFormat)}</Badge>
                <Badge>{t(job.employmentType)}</Badge>
              </div>
            </header>
            <StatRow>
              <Stat
                label={t("salaryMin")}
                value={salary}
                muted={!job.salaryMin}
              />
              <Stat
                label={t("country")}
                value={job.locationCountry ?? t("worldwide")}
                muted={!job.locationCountry}
              />
              <Stat
                label={t("timezone")}
                value={
                  job.timezoneRequired
                    ? `${job.timezoneRequired} · ${job.minOverlapHours}h`
                    : t("worldwide")
                }
                muted={!job.timezoneRequired}
              />
            </StatRow>
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
            <div className="whitespace-pre-wrap">{job.description}</div>
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
            </div>
          </aside>
        </div>
      </Container>
    </main>
  );
}
