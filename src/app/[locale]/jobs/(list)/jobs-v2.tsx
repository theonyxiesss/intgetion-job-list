// v2 (UI_V2) layout of this route; page.tsx renders it when the flag is on.
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  JOB_CATEGORIES,
  SECTORS,
  SENIORITY_LEVELS,
  PERKS,
} from "@/config/markers";
import { Link } from "@/i18n/navigation";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { PillSelect } from "@/components/ui/pill-select";
import { Input, Select } from "@/components/ui/input";
import { Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { getHiddenSetsForViewer } from "@/modules/feedback/service";
import { isJobSavedForUser } from "@/modules/feedback/service";
import { JobFeedbackActions } from "@/modules/feedback/ui/job-feedback-actions";
import { formatMoneyDto } from "@/lib/money";
import { intlLocale } from "@/i18n/locale";
import { CompanyMarkFor } from "@/components/ui/company-mark";
import { Badge } from "@/components/ui/badge";
import { markdownToPlain } from "@/lib/rich-text";
import { publicJobText } from "@/lib/public-job-text";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import {
  listPromotedJobs,
  listSearchSkillOptions,
  searchJobs,
} from "@/modules/jobs/service";
import { RememberFilters } from "@/modules/jobs/ui/remember-filters";
import { SaveSearchButton } from "@/modules/saved-searches/ui/save-search-button";
import { RouteMessages } from "@/components/shell/route-messages";

const categories = JOB_CATEGORIES;

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
    "sector",
    "seniority",
    "perk",
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

/** Filters folded under "More filters" on the catalog (D477). */
function advancedCount(raw: Record<string, string | string[] | undefined>) {
  const keys = [
    "skills",
    "sector",
    "perk",
    "country",
    "tzOverlapWith",
    "salaryMin",
    "currency",
  ];
  let count = keys.filter(
    (key) => text(raw, key) || Array.isArray(raw[key]),
  ).length;
  if (text(raw, "minOverlap") && text(raw, "minOverlap") !== "3") count += 1;
  if (text(raw, "period") && text(raw, "period") !== "month") count += 1;
  if (text(raw, "basis") && text(raw, "basis") !== "gross") count += 1;
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

/** Catalog title and description for search (D211). */

export async function JobsPageV2({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("jobs");
  const actions = await getTranslations("jobActions");
  const categoryNames = await getTranslations("categories");
  const markers = await getTranslations("markers");
  let signedIn = false;
  const raw = await searchParams;
  const parsed = jobSearchQuery.safeParse(raw);
  let viewer: Parameters<typeof searchJobs>[2] = { hidden: null };
  let viewerId: string | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const viewerUser = await getCurrentUser(supabase.auth);
    if (viewerUser) {
      signedIn = true;
      viewerId = viewerUser.id;
      viewer = { hidden: await getHiddenSetsForViewer(viewerUser.id) };
    }
  } catch {
    // No session → guest view.
  }
  const showPromoted = activeCount(raw) === 0 && !text(raw, "cursor");
  const promoted = showPromoted ? await listPromotedJobs(locale, viewer) : [];
  const result = await searchJobs(
    parsed.success ? parsed.data : jobSearchQuery.parse({}),
    locale,
    viewer,
  );
  const skillOptions = await listSearchSkillOptions(locale);
  const selectedId = text(raw, "selected");
  const selectedJob =
    result.items.find((job) => job.id === selectedId) ??
    result.items[0] ??
    promoted[0] ??
    null;
  const selectedSaved =
    selectedJob && viewerId
      ? await isJobSavedForUser(viewerId, selectedJob.id)
      : false;
  const nextParams = new URLSearchParams();
  const selectionParams = new URLSearchParams();
  for (const [key, value] of Object.entries(raw))
    for (const item of Array.isArray(value) ? value : value ? [value] : []) {
      nextParams.append(key, item);
      if (key !== "cursor" && key !== "selected")
        selectionParams.append(key, item);
    }
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
    <RouteMessages namespaces={["savedSearches"]}>
      <main className="min-h-[calc(100dvh-4rem)] bg-bg">
        <header className="v2-jobs-header sticky top-16 z-20 flex flex-col gap-4 border-b border-line bg-bg px-4 pt-5 pb-4 md:px-6 lg:top-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
              {t("v2.title")}
            </h1>
            <nav
              aria-label={t("filters")}
              className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
            >
              <Link
                href={without(raw, "selected")}
                aria-current="page"
                className="rounded-lg bg-surface px-3 py-1.5 text-sm font-medium"
              >
                {t("v2.all")}
              </Link>
              <Link
                href="/matches"
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
              >
                {t("v2.forMe")}
              </Link>
              <Link
                href="/saved-jobs"
                className="rounded-lg px-3 py-1.5 text-sm text-fg-muted hover:text-fg"
              >
                {t("v2.saved")}
              </Link>
            </nav>
          </div>
          <form id="catalog-filters" action="" className="flex flex-col gap-3">
            <label className="sr-only" htmlFor="job-q">
              {t("search")}
            </label>
            <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-surface pr-1.5 pl-4 focus-within:border-line-strong">
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                aria-hidden="true"
                className="shrink-0 text-fg-subtle"
              >
                <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4" />
              </svg>
              <input
                id="job-q"
                name="q"
                type="search"
                defaultValue={text(raw, "q")}
                placeholder={t("v2.searchPlaceholder")}
                className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-fg-subtle focus-visible:outline-none"
              />
              <Link
                href="/chat"
                className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-surface-2"
              >
                <span aria-hidden="true">+</span>
                {t("v2.pickWithSpoki")}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PillSelect
                aria-label={t("format")}
                name="workFormat"
                defaultValue={text(raw, "workFormat")}
                active={Boolean(text(raw, "workFormat"))}
              >
                <option value="">{t("v2.anyFormat")}</option>
                <option value="remote">{t("remote")}</option>
                <option value="hybrid">{t("hybrid")}</option>
                <option value="onsite">{t("onsite")}</option>
              </PillSelect>
              <PillSelect
                aria-label={t("category")}
                name="category"
                defaultValue={text(raw, "category")}
                active={Boolean(text(raw, "category"))}
              >
                <option value="">{t("category")}</option>
                {categories.map((id) => (
                  <option key={id} value={id}>
                    {categoryNames(id)}
                  </option>
                ))}
              </PillSelect>
              <PillSelect
                aria-label={markers("seniorityLabel")}
                name="seniority"
                defaultValue={text(raw, "seniority")}
                active={Boolean(text(raw, "seniority"))}
              >
                <option value="">{t("v2.level")}</option>
                {SENIORITY_LEVELS.map((id) => (
                  <option key={id} value={id}>
                    {markers(`seniority.${id}`)}
                  </option>
                ))}
              </PillSelect>
              <PillSelect
                aria-label={t("employment")}
                name="employmentType"
                defaultValue={text(raw, "employmentType")}
                active={Boolean(text(raw, "employmentType"))}
              >
                <option value="">{t("v2.employment")}</option>
                <option value="full_time">{t("full_time")}</option>
                <option value="part_time">{t("part_time")}</option>
                <option value="contract">{t("contract")}</option>
                <option value="freelance">{t("freelance")}</option>
                <option value="internship">{t("internship")}</option>
              </PillSelect>
              <PillSelect
                aria-label={t("postedWithinLabel")}
                name="postedWithin"
                defaultValue={text(raw, "postedWithin")}
                active={Boolean(text(raw, "postedWithin"))}
              >
                <option value="">{t("v2.posted")}</option>
                <option value="1">{t("day")}</option>
                <option value="7">{t("week")}</option>
                <option value="30">{t("monthPosted")}</option>
              </PillSelect>
              <details
                className="relative"
                open={advancedCount(raw) > 0 ? undefined : undefined}
              >
                <summary
                  className={`flex h-9 cursor-pointer list-none items-center rounded-full border px-3.5 text-sm hover:border-fg-subtle ${advancedCount(raw) > 0 ? "border-accent bg-surface-2" : "border-line-strong bg-surface"}`}
                >
                  {advancedCount(raw) > 0
                    ? `${t("v2.more")} · ${advancedCount(raw)}`
                    : t("v2.more")}
                </summary>
                <div className="absolute top-11 left-0 z-30 grid w-[min(92vw,640px)] gap-3 rounded-2xl border border-line-strong bg-surface p-4 shadow-xl sm:grid-cols-2">
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
                    aria-label={markers("sector")}
                    name="sector"
                    defaultValue={text(raw, "sector")}
                  >
                    <option value="">{markers("anySector")}</option>
                    {SECTORS.map((id) => (
                      <option key={id} value={id}>
                        {markers(`sectors.${id}`)}
                      </option>
                    ))}
                  </Select>
                  <Select
                    aria-label={markers("perk")}
                    name="perk"
                    defaultValue={text(raw, "perk")}
                  >
                    <option value="">{markers("anyPerk")}</option>
                    {PERKS.map((id) => (
                      <option key={id} value={id}>
                        {markers(`perks.${id}`)}
                      </option>
                    ))}
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
                  <Button type="submit" className="sm:col-span-2">
                    {t("applyFilters")}
                  </Button>
                </div>
              </details>
              {activeCount(raw) > 0 ? (
                <Link
                  href="/jobs"
                  className="px-2 text-sm text-fg-muted hover:text-fg"
                >
                  {t("v2.reset")}
                </Link>
              ) : null}
              <button type="submit" className="sr-only">
                {t("applyFilters")}
              </button>
            </div>
          </form>
          <RememberFilters
            query={
              activeCount(raw) > 0
                ? without(raw, "cursor").replace(/^\?/, "")
                : ""
            }
            label={t("restoreFilters")}
          />
          {activeCount(raw) > 0 && signedIn ? (
            <SaveSearchButton
              query={without(raw, "cursor").replace(/^\?/, "")}
              name={
                chips
                  .map((chip) => chip.label)
                  .join(", ")
                  .slice(0, 80) || t("title")
              }
            />
          ) : null}
        </header>
        <div className="grid min-h-[calc(100dvh-13rem)] lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
          <section
            aria-label={t("title")}
            className="flex flex-col gap-2 border-r border-line p-3 md:p-4"
          >
            <div className="flex items-center justify-between gap-2 px-1 pb-1 text-sm text-fg-muted">
              <span>{t("v2.count", { count: result.items.length })}</span>
              <label className="sr-only" htmlFor="job-sort">
                {t("sort")}
              </label>
              <PillSelect
                id="job-sort"
                form="catalog-filters"
                name="sort"
                defaultValue={text(raw, "sort") || "newest"}
                className="h-8 border-transparent bg-transparent text-fg-muted"
              >
                <option value="newest">{t("newest")}</option>
                <option value="relevance">{t("relevance")}</option>
                <option value="salary">{t("highestSalary")}</option>
              </PillSelect>
            </div>
            {chips.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <Link
                      href={without(raw, chip.key)}
                      aria-label={t("clearFilter")}
                      className="inline-flex"
                    >
                      <Tag>
                        <span aria-hidden="true">{chip.label} ×</span>
                      </Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {result.items.length ? (
              <ul className="flex flex-col gap-2">
                {result.items.map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`?${new URLSearchParams([...selectionParams.entries(), ["selected", job.id]]).toString()}`}
                      aria-current={
                        selectedJob?.id === job.id ? "true" : undefined
                      }
                      className={`flex gap-3 rounded-2xl border p-3.5 transition-colors hover:bg-surface ${selectedJob?.id === job.id ? "border-line-strong bg-surface" : "border-line bg-bg"}`}
                    >
                      <JobAvatar company={job.company} />
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex justify-between gap-2 text-[15px] font-semibold">
                          <span className="truncate">{job.title}</span>
                          {job.promoted ? (
                            <Badge tone="new">{t("promoted")}</Badge>
                          ) : null}
                        </span>
                        <span className="text-sm text-fg-muted">
                          {job.company.name} ·{" "}
                          {job.location?.trim() ||
                            job.locationCountry ||
                            t("worldwide")}
                        </span>
                        <span className="text-sm font-medium">
                          {job.salaryMin
                            ? `${formatMoneyDto(job.salaryMin, intlLocale(locale))}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, intlLocale(locale))}` : ""} / ${t(job.salaryMin.period)}`
                            : t("salaryMissing")}
                        </span>
                      </span>
                    </Link>
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
          </section>
          <article
            aria-label={t("title")}
            className="flex min-w-0 flex-col gap-6 p-5 md:p-6"
          >
            {selectedJob ? (
              <>
                <div className="flex flex-wrap items-start gap-4">
                  <JobAvatar company={selectedJob.company} large />
                  <div className="min-w-0 flex-[1_1_280px]">
                    <h2 className="text-[22px] leading-tight font-semibold tracking-tight">
                      {selectedJob.title}
                    </h2>
                    <Link
                      href={`/companies/${selectedJob.company.slug}`}
                      className="text-sm text-fg-muted underline-offset-4 hover:underline"
                    >
                      {selectedJob.company.name}
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {signedIn ? (
                      <JobFeedbackActions
                        jobId={selectedJob.id}
                        initialSaved={selectedSaved}
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
                            discrimination: actions(
                              "reportReasons.discrimination",
                            ),
                            wrong_info: actions("reportReasons.wrong_info"),
                            inappropriate: actions(
                              "reportReasons.inappropriate",
                            ),
                            other: actions("reportReasons.other"),
                          },
                        }}
                      />
                    ) : null}
                    <Link
                      href={`/jobs/${selectedJob.id}`}
                      className="flex min-h-11 items-center rounded-xl bg-fg px-5 text-sm font-semibold text-bg hover:opacity-90"
                    >
                      {t("v2.apply")}
                    </Link>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    [
                      t("v2.salary"),
                      selectedJob.salaryMin
                        ? `${formatMoneyDto(selectedJob.salaryMin, intlLocale(locale))}${selectedJob.salaryMax ? ` – ${formatMoneyDto(selectedJob.salaryMax, intlLocale(locale))}` : ""}`
                        : t("salaryMissing"),
                    ],
                    [
                      t("v2.level"),
                      selectedJob.seniority
                        ? markers(`seniority.${selectedJob.seniority}`)
                        : "—",
                    ],
                    [t("v2.employment"), t(selectedJob.employmentType)],
                    [
                      t("v2.zone"),
                      selectedJob.timezoneRequired
                        ? `${selectedJob.timezoneRequired} · ${selectedJob.minOverlapHours}h`
                        : t(selectedJob.workFormat),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-line bg-surface p-3"
                    >
                      <dt className="text-xs text-fg-subtle">{label}</dt>
                      <dd className="mt-1 text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <section>
                  <h3 className="mb-2 text-[15px] font-semibold">
                    {t("v2.skills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.skills.slice(0, 6).map((skill) => (
                      <Tag key={skill.id}>{skill.name}</Tag>
                    ))}
                  </div>
                </section>
                {selectedJob.description ? (
                  <section>
                    <h3 className="mb-2 text-[15px] font-semibold">
                      {t("v2.about")}
                    </h3>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-fg-muted">
                      {markdownToPlain(publicJobText(selectedJob.description))}
                    </p>
                  </section>
                ) : null}
              </>
            ) : (
              <EmptyState title={t("empty")} />
            )}
          </article>
        </div>
      </main>
    </RouteMessages>
  );
}

const AVATAR_TONES = [
  "bg-[#8ab4ff] text-[#0b0b0c]",
  "bg-[#f2c46b] text-[#0b0b0c]",
  "bg-[#c4a6ff] text-[#0b0b0c]",
  "bg-[#7ee0b5] text-[#0b0b0c]",
  "bg-[#ff9f8a] text-[#0b0b0c]",
];

/** The mockup's lettered square; a real logo wins when the company has one. */
function JobAvatar({
  company,
  large = false,
}: {
  company: Parameters<typeof CompanyMarkFor>[0]["company"] & { name: string };
  large?: boolean;
}) {
  if (company.logoPath) {
    return (
      <CompanyMarkFor company={company} size={large ? "page" : undefined} />
    );
  }
  let hash = 0;
  for (const char of company.name)
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl font-semibold ${AVATAR_TONES[hash % AVATAR_TONES.length]} ${large ? "size-12 text-lg" : "size-10"}`}
    >
      {company.name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
