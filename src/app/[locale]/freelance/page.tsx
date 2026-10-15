import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREELANCE_CATEGORIES } from "@/config/freelance";
import { Tag } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { localePrefix } from "@/i18n/paths";
import {
  FREELANCE_BUDGETS,
  FREELANCE_FILTER_LANGUAGES,
  FREELANCE_SORTS,
  FREELANCE_TERMS,
  listCatalog,
  parseFreelanceSearch,
  type FreelanceSearchQuery,
} from "@/modules/freelance/service";
import { formatUsd, languageNames } from "@/modules/freelance/ui/format";
import { ServiceCard } from "@/modules/freelance/ui/service-card";
import { FilterShell } from "@/modules/jobs/ui/filter-shell";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

export const dynamic = "force-dynamic";

const FILTER_KEYS = ["q", "category", "budget", "days", "lang"] as const;

function queryString(
  query: FreelanceSearchQuery,
  changes: Partial<
    Record<keyof FreelanceSearchQuery, string | number | undefined>
  >,
): string {
  const params = new URLSearchParams();
  const merged = { ...query, ...changes };
  for (const key of [...FILTER_KEYS, "sort", "page"] as const) {
    const value = merged[key];
    if (value === undefined || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    if (key === "sort" && value === "fit") continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `/freelance?${text}` : "/freelance";
}

/** Catalog title and description for search (D446). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "freelance" });
  return {
    title: t("metaTitle"),
    description: t("subtitle"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/freelance`,
      languages: languageAlternates("/freelance"),
    },
  };
}

export default async function FreelancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("freelance");
  const query = parseFreelanceSearch(await searchParams);
  const { cards, total, hasMore } = await listCatalog(query, locale);
  const active = FILTER_KEYS.filter((key) => query[key] !== undefined);
  const dollars = (amount: number) =>
    formatUsd(BigInt(amount) * BigInt(100), locale);
  const chipLabel = (key: (typeof FILTER_KEYS)[number]): string => {
    if (key === "category") return t(`categories.${query.category}`);
    if (key === "budget")
      return t("upTo", { price: dollars(query.budget ?? 0) });
    if (key === "days") return t("upToDays", { count: query.days ?? 0 });
    if (key === "lang") return languageNames([query.lang ?? ""], locale);
    return String(query[key]);
  };

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={t("title")}
          intro={t("subtitle")}
          actions={
            <Link href="/services" className={buttonClass("secondary")}>
              {t("teamLink")}
            </Link>
          }
        />
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <form
            id="freelance-filters"
            action=""
            className="flex flex-col gap-4"
          >
            <FilterShell
              count={active.length}
              filtersLabel={t("filters")}
              closeLabel={t("closeFilters")}
            >
              <Field label={t("category")}>
                <Select name="category" defaultValue={query.category ?? ""}>
                  <option value="">{t("anyCategory")}</option>
                  {FREELANCE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {t(`categories.${category}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("budget")}>
                <Select name="budget" defaultValue={query.budget ?? ""}>
                  <option value="">{t("anyBudget")}</option>
                  {FREELANCE_BUDGETS.map((amount) => (
                    <option key={amount} value={amount}>
                      {t("upTo", { price: dollars(amount) })}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("term")}>
                <Select name="days" defaultValue={query.days ?? ""}>
                  <option value="">{t("anyTerm")}</option>
                  {FREELANCE_TERMS.map((days) => (
                    <option key={days} value={days}>
                      {t("upToDays", { count: days })}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("language")}>
                <Select name="lang" defaultValue={query.lang ?? ""}>
                  <option value="">{t("anyLanguage")}</option>
                  {FREELANCE_FILTER_LANGUAGES.map((code) => (
                    <option key={code} value={code}>
                      {languageNames([code], locale)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("sort")}>
                <Select name="sort" defaultValue={query.sort}>
                  {FREELANCE_SORTS.map((sort) => (
                    <option key={sort} value={sort}>
                      {t(`sorts.${sort}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit">{t("applyFilters")}</Button>
            </FilterShell>
          </form>
          <div className="relative z-10 flex min-w-0 flex-col gap-4">
            <label className="sr-only" htmlFor="freelance-q">
              {t("search")}
            </label>
            <Input
              id="freelance-q"
              name="q"
              type="search"
              form="freelance-filters"
              defaultValue={query.q ?? ""}
              placeholder={t("search")}
            />
            {active.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {active.map((key) => (
                  <li key={key}>
                    <Link
                      href={queryString(query, { [key]: undefined, page: 1 })}
                      className="inline-flex"
                      aria-label={`${t("clearFilter")}: ${chipLabel(key)}`}
                    >
                      <Tag>
                        <span aria-hidden="true">{chipLabel(key)} ×</span>
                      </Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            {cards.length > 0 ? (
              <>
                <p className="t-label text-fg-muted" aria-live="polite">
                  {t("results", { count: total })}
                </p>
                <ul className="grid gap-4 md:grid-cols-2">
                  {cards.map((card) => (
                    <li key={card.id}>
                      <ServiceCard card={card} locale={locale} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <EmptyState
                title={active.length > 0 ? t("emptyFiltered") : t("empty")}
                text={
                  active.length > 0 ? t("emptyFilteredText") : t("emptyText")
                }
                action={
                  <Link href="/services" className={buttonClass("secondary")}>
                    {t("teamLink")}
                  </Link>
                }
              />
            )}
            {query.page > 1 || hasMore ? (
              <nav
                aria-label={t("pagination")}
                className="flex flex-wrap gap-3"
              >
                {query.page > 1 ? (
                  <Link
                    className={buttonClass("secondary")}
                    href={queryString(query, { page: query.page - 1 })}
                  >
                    {t("previous")}
                  </Link>
                ) : null}
                {hasMore ? (
                  <Link
                    className={buttonClass("secondary")}
                    href={queryString(query, { page: query.page + 1 })}
                    {...navForward}
                  >
                    {t("next")}
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
        </div>
      </Container>
    </main>
  );
}
