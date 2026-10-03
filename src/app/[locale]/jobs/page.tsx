import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/container";
import { Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { listSearchSkillOptions, searchJobs } from "@/modules/jobs/service";
import { FilterShell } from "@/modules/jobs/ui/filter-shell";
import { PublicJobCard } from "@/modules/jobs/ui/public-job-card";

export const dynamic = "force-dynamic";

const categories = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
] as const;

function text(raw: Record<string, string | string[] | undefined>, key: string) {
  const value = raw[key];
  return typeof value === "string" ? value : "";
}

function activeCount(raw: Record<string, string | string[] | undefined>) {
  const keys = [
    "q",
    "category",
    "skills",
    "workFormat",
    "employmentType",
    "country",
    "tzOverlapWith",
    "salaryMin",
    "currency",
    "source",
    "postedWithin",
  ];
  let count = keys.filter(
    (key) => text(raw, key) || Array.isArray(raw[key]),
  ).length;
  if (text(raw, "minOverlap") && text(raw, "minOverlap") !== "3") count += 1;
  if (text(raw, "period") && text(raw, "period") !== "month") count += 1;
  if (text(raw, "basis") && text(raw, "basis") !== "gross") count += 1;
  if (text(raw, "sort") && text(raw, "sort") !== "newest") count += 1;
  return count;
}

function without(
  raw: Record<string, string | string[] | undefined>,
  drop: string,
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === drop || key === "cursor") continue;
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      params.append(key, item);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "/jobs";
}

export default async function JobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const categoryNames = await getTranslations("categories");
  const raw = await searchParams;
  const parsed = jobSearchQuery.safeParse(raw);
  let viewer: Parameters<typeof searchJobs>[2] = { hidden: null };
  try {
    const supabase = await createSupabaseServerClient();
    const viewerUser = await getCurrentUser(supabase.auth);
    if (viewerUser) {
      viewer = { hidden: await getHiddenSetsForViewer(viewerUser.id) };
    }
  } catch {
    // No session → guest view.
  }
  const result = await searchJobs(
    parsed.success ? parsed.data : jobSearchQuery.parse({}),
    locale,
    viewer,
  );
  const skillOptions = await listSearchSkillOptions(locale);
  const nextParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    for (const item of Array.isArray(value) ? value : value ? [value] : [])
      nextParams.append(key, item);
  if (result.nextCursor) nextParams.set("cursor", result.nextCursor);

  const chips = [
    text(raw, "q") ? { key: "q", label: text(raw, "q") } : null,
    text(raw, "category")
      ? { key: "category", label: categoryNames(text(raw, "category")) }
      : null,
    text(raw, "workFormat")
      ? { key: "workFormat", label: t(text(raw, "workFormat")) }
      : null,
    text(raw, "employmentType")
      ? { key: "employmentType", label: t(text(raw, "employmentType")) }
      : null,
    text(raw, "country")
      ? { key: "country", label: text(raw, "country") }
      : null,
    text(raw, "source")
      ? { key: "source", label: t(text(raw, "source")) }
      : null,
  ].filter((chip) => chip !== null);

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("subtitle")} />
        <form
          action=""
          className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start"
        >
          <FilterShell
            count={activeCount(raw)}
            filtersLabel={t("filters")}
            closeLabel={t("closeFilters")}
          >
            <Select
              aria-label={t("category")}
              name="category"
              defaultValue={text(raw, "category")}
            >
              <option value="">{t("anyCategory")}</option>
              {categories.map((id) => (
                <option key={id} value={id}>
                  {categoryNames(id)}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t("skillsFilter")}
              name="skills"
              multiple
              size={3}
              defaultValue={
                typeof raw.skills === "string"
                  ? raw.skills.split(",")
                  : (raw.skills ?? [])
              }
            >
              {skillOptions.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </Select>
            <Select
              aria-label={t("format")}
              name="workFormat"
              defaultValue={text(raw, "workFormat")}
            >
              <option value="">{t("any")}</option>
              <option value="remote">{t("remote")}</option>
              <option value="hybrid">{t("hybrid")}</option>
              <option value="onsite">{t("onsite")}</option>
            </Select>
            <Select
              aria-label={t("employment")}
              name="employmentType"
              defaultValue={text(raw, "employmentType")}
            >
              <option value="">{t("anyEmployment")}</option>
              <option value="full_time">{t("full_time")}</option>
              <option value="part_time">{t("part_time")}</option>
              <option value="contract">{t("contract")}</option>
            </Select>
            <Input
              aria-label={t("country")}
              name="country"
              defaultValue={text(raw, "country")}
              placeholder={t("country")}
              maxLength={2}
            />
            <Input
              aria-label={t("timezone")}
              name="tzOverlapWith"
              defaultValue={text(raw, "tzOverlapWith")}
              placeholder={t("timezoneExample")}
            />
            <Input
              aria-label={t("minimumOverlap")}
              name="minOverlap"
              type="number"
              min="0"
              max="12"
              defaultValue={text(raw, "minOverlap") || "3"}
            />
            <Input
              aria-label={t("salaryMin")}
              name="salaryMin"
              inputMode="numeric"
              defaultValue={text(raw, "salaryMin")}
              placeholder={t("salaryMin")}
            />
            <Input
              aria-label={t("currency")}
              name="currency"
              defaultValue={text(raw, "currency")}
              placeholder={t("currencyExample")}
              maxLength={3}
            />
            <Select
              aria-label={t("period")}
              name="period"
              defaultValue={text(raw, "period") || "month"}
            >
              <option value="hour">{t("hour")}</option>
              <option value="month">{t("month")}</option>
              <option value="year">{t("year")}</option>
            </Select>
            <Select
              aria-label={t("basis")}
              name="basis"
              defaultValue={text(raw, "basis") || "gross"}
            >
              <option value="gross">{t("gross")}</option>
              <option value="net">{t("net")}</option>
            </Select>
            <Select
              aria-label={t("sourceFilter")}
              name="source"
              defaultValue={text(raw, "source")}
            >
              <option value="">{t("anySource")}</option>
              <option value="internal">{t("internal")}</option>
              <option value="imported">{t("imported")}</option>
            </Select>
            <Select
              aria-label={t("postedWithinLabel")}
              name="postedWithin"
              defaultValue={text(raw, "postedWithin")}
            >
              <option value="">{t("anyDate")}</option>
              <option value="1">{t("day")}</option>
              <option value="7">{t("week")}</option>
              <option value="30">{t("monthPosted")}</option>
            </Select>
            <Select
              aria-label={t("sort")}
              name="sort"
              defaultValue={text(raw, "sort") || "newest"}
            >
              <option value="newest">{t("newest")}</option>
              <option value="relevance">{t("relevance")}</option>
              <option value="salary">{t("highestSalary")}</option>
            </Select>
            <Button type="submit">{t("applyFilters")}</Button>
          </FilterShell>
          <div className="flex min-w-0 flex-col gap-4">
            <label className="sr-only" htmlFor="job-q">
              {t("search")}
            </label>
            <Input
              id="job-q"
              name="q"
              defaultValue={text(raw, "q")}
              placeholder={t("search")}
            />
            {chips.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <Link href={without(raw, chip.key)} className="inline-flex">
                      <Tag>{chip.label} ×</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {result.items.length ? (
              <ul className="grid gap-4">
                {result.items.map((job) => (
                  <li key={job.id}>
                    <PublicJobCard job={job} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("empty")} />
            )}
            {result.nextCursor ? (
              <Link
                className={buttonClass("secondary")}
                href={`?${nextParams.toString()}`}
                {...navForward}
              >
                {t("next")}
              </Link>
            ) : null}
          </div>
        </form>
      </Container>
    </main>
  );
}
