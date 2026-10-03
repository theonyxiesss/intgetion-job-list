import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatMoneyDto } from "@/lib/money";
import { getJobForPublic } from "@/modules/jobs/service";

export default async function JobPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const job = await getJobForPublic(id, { locale });
  if (!job) notFound();
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
      {job.applicationUrl && (
        <a
          className="min-h-11 self-start rounded bg-blue-700 px-4 py-3 text-white"
          href={job.applicationUrl}
          rel="noreferrer"
        >
          {t("apply")}
        </a>
      )}
    </main>
  );
}
