import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatMoneyDto } from "@/lib/money";
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
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <p className="text-sm">
        {job.company.isTrusted
          ? t("trusted")
          : job.source.type === "imported"
            ? `${t("importedFrom")} ${job.source.name ?? ""}`
            : t("company")}
      </p>
      <h1 className="text-4xl font-semibold">{job.title}</h1>
      <p>
        <a
          className="underline"
          href={`/${locale}/companies/${job.company.slug}`}
        >
          {job.company.name}
        </a>{" "}
        · {t(job.workFormat)} · {t(job.employmentType)}
      </p>
      <p>{job.locationCountry ?? t("worldwide")}</p>
      <p>
        {job.timezoneRequired
          ? `${t("timezone")}: ${job.timezoneRequired} · ${job.minOverlapHours}h`
          : ""}
      </p>
      <p>
        {job.salaryMin
          ? `${formatMoneyDto(job.salaryMin, locale === "ru" ? "ru-RU" : "en-US")}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, locale === "ru" ? "ru-RU" : "en-US")}` : ""} / ${t(job.salaryMin.period)} (${t(job.salaryMin.basis)})`
          : t("salaryMissing")}
      </p>
      {job.skills.length > 0 && (
        <p>
          {job.skills.map((skill) => skill.name).join(", ")}
          {job.skillsMore ? ` +${job.skillsMore}` : ""}
        </p>
      )}
      <p>
        {job.languages
          .map((language) => `${language.lang} ${language.minLevel}`)
          .join(" · ")}
      </p>
      <div className="whitespace-pre-wrap">{job.description}</div>
      {user && (
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
      )}
      {job.applicationUrl && job.applicationMethod === "external_url" ? (
        <ExternalApplyLink
          jobId={job.id}
          href={job.applicationUrl}
          label={t("apply")}
        />
      ) : null}
    </main>
  );
}
