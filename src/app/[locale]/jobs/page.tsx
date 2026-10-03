import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { formatMoneyDto } from "@/lib/money";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { listSearchSkillOptions, searchJobs } from "@/modules/jobs/service";

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }
export default async function JobsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { locale } = await params; setRequestLocale(locale); const t = await getTranslations("jobs"); const categories = await getTranslations("categories");
  const raw = await searchParams; const parsed = jobSearchQuery.safeParse(raw);
  const result = await searchJobs(parsed.success ? parsed.data : jobSearchQuery.parse({}), locale);
  const skillOptions = await listSearchSkillOptions(locale);
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) for (const item of Array.isArray(value) ? value : value ? [value] : []) nextParams.append(key, item);
  if (result.nextCursor) nextParams.set("cursor", result.nextCursor);
  return <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
    <h1 className="text-3xl font-semibold">{t("title")}</h1>
    <form action="" className="flex flex-wrap gap-3"><label className="sr-only" htmlFor="job-q">{t("search")}</label><input id="job-q" name="q" defaultValue={typeof raw.q === "string" ? raw.q : ""} placeholder={t("search")} className="min-h-11 flex-1 rounded border px-3" />
      <select aria-label={t("category")} name="category" defaultValue={typeof raw.category === "string" ? raw.category : ""} className="min-h-11 rounded border px-3"><option value="">{t("anyCategory")}</option>{["engineering","data","design","product","marketing","sales","support","operations","finance","hr"].map((id) => <option key={id} value={id}>{categories(id)}</option>)}</select>
      <select aria-label={t("skillsFilter")} name="skills" multiple size={3} defaultValue={typeof raw.skills === "string" ? raw.skills.split(",") : raw.skills ?? []} className="min-h-11 rounded border px-3">{skillOptions.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select>
      <select aria-label={t("format")} name="workFormat" defaultValue={typeof raw.workFormat === "string" ? raw.workFormat : ""} className="min-h-11 rounded border px-3"><option value="">{t("any")}</option><option value="remote">{t("remote")}</option><option value="hybrid">{t("hybrid")}</option><option value="onsite">{t("onsite")}</option></select>
      <select aria-label={t("employment")} name="employmentType" defaultValue={typeof raw.employmentType === "string" ? raw.employmentType : ""} className="min-h-11 rounded border px-3"><option value="">{t("anyEmployment")}</option><option value="full_time">{t("full_time")}</option><option value="part_time">{t("part_time")}</option><option value="contract">{t("contract")}</option></select>
      <input aria-label={t("country")} name="country" defaultValue={typeof raw.country === "string" ? raw.country : ""} placeholder={t("country")} maxLength={2} className="min-h-11 w-28 rounded border px-3" />
      <input aria-label={t("timezone")} name="tzOverlapWith" defaultValue={typeof raw.tzOverlapWith === "string" ? raw.tzOverlapWith : ""} placeholder={t("timezoneExample")} className="min-h-11 w-48 rounded border px-3" />
      <input aria-label={t("minimumOverlap")} name="minOverlap" type="number" min="0" max="12" defaultValue={typeof raw.minOverlap === "string" ? raw.minOverlap : "3"} className="min-h-11 w-24 rounded border px-3" />
      <input aria-label={t("salaryMin")} name="salaryMin" inputMode="numeric" defaultValue={typeof raw.salaryMin === "string" ? raw.salaryMin : ""} placeholder={t("salaryMin")} className="min-h-11 w-32 rounded border px-3" />
      <input aria-label={t("currency")} name="currency" defaultValue={typeof raw.currency === "string" ? raw.currency : ""} placeholder={t("currencyExample")} maxLength={3} className="min-h-11 w-24 rounded border px-3" />
      <select aria-label={t("period")} name="period" defaultValue={typeof raw.period === "string" ? raw.period : "month"} className="min-h-11 rounded border px-3"><option value="hour">{t("hour")}</option><option value="month">{t("month")}</option><option value="year">{t("year")}</option></select>
      <select aria-label={t("basis")} name="basis" defaultValue={typeof raw.basis === "string" ? raw.basis : "gross"} className="min-h-11 rounded border px-3"><option value="gross">{t("gross")}</option><option value="net">{t("net")}</option></select>
      <select aria-label={t("sourceFilter")} name="source" defaultValue={typeof raw.source === "string" ? raw.source : ""} className="min-h-11 rounded border px-3"><option value="">{t("anySource")}</option><option value="internal">{t("internal")}</option><option value="imported">{t("imported")}</option></select>
      <select aria-label={t("postedWithinLabel")} name="postedWithin" defaultValue={typeof raw.postedWithin === "string" ? raw.postedWithin : ""} className="min-h-11 rounded border px-3"><option value="">{t("anyDate")}</option><option value="1">{t("day")}</option><option value="7">{t("week")}</option><option value="30">{t("monthPosted")}</option></select>
      <select aria-label={t("sort")} name="sort" defaultValue={typeof raw.sort === "string" ? raw.sort : "newest"} className="min-h-11 rounded border px-3"><option value="newest">{t("newest")}</option><option value="relevance">{t("relevance")}</option><option value="salary">{t("highestSalary")}</option></select>
      <button className="min-h-11 rounded bg-foreground px-4 text-background">{t("applyFilters")}</button></form>
    {result.items.length ? <ul className="grid gap-4">{result.items.map((job) => <li key={job.id} className="rounded-lg border p-5"><Link className="text-xl font-semibold underline" href={`/${locale}/jobs/${job.id}`}>{job.title}</Link><p><Link href={`/${locale}/companies/${job.company.slug}`} className="underline">{job.company.name}</Link> · {t(job.workFormat)} · {t(job.employmentType)}</p><p className="mt-2 line-clamp-3">{job.description}</p><p>{job.salaryMin ? `${formatMoneyDto(job.salaryMin, locale === "ru" ? "ru-RU" : "en-US")}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, locale === "ru" ? "ru-RU" : "en-US")}` : ""} / ${t(job.salaryMin.period)} (${t(job.salaryMin.basis)})` : t("salaryMissing")}</p><p>{job.timezoneRequired ? `${t("timezone")}: ${job.timezoneRequired} · ${job.minOverlapHours}h` : t("worldwide")}</p>{job.skills.length > 0 && <p>{job.skills.map((skill) => skill.name).join(", ")}{job.skillsMore ? ` +${job.skillsMore}` : ""}</p>}<p>{job.languages.map((language) => `${language.lang} ${language.minLevel}`).join(" · ")}</p></li>)}</ul> : <p>{t("empty")}</p>}
    {result.nextCursor && <Link className="min-h-11 self-start rounded border px-4 py-2" href={`?${nextParams.toString()}`}>{t("next")}</Link>}
  </main>;
}
