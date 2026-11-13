// v2 (UI_V2) layout of this route; page.tsx renders it when the flag is on.
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FREELANCE_CATEGORIES } from "@/config/freelance";
import { Tag } from "@/components/ui/badge";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
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

export async function FreelancePageV2({
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

  const seg = (on: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`;
  const extra = active.filter((key) => key !== "category" && key !== "q");
  const banner = (href: string, icon: string, title: string, text: string) => (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4 transition-colors hover:border-line-strong"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-muted"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={icon} />
        </svg>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-sm text-fg-muted">{text}</span>
      </span>
      <span aria-hidden="true" className="text-fg-subtle">
        ›
      </span>
    </Link>
  );

  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
            {t("v2.title")}
          </h1>
          <nav
            aria-label={t("v2.title")}
            className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
          >
            <Link href="/freelance" aria-current="page" className={seg(true)}>
              {t("v2.asClient")}
            </Link>
            <Link href="/profile/freelance" className={seg(false)}>
              {t("v2.asSeller")}
            </Link>
          </nav>
          <Link
            href="/freelance/orders"
            className="flex min-h-10 items-center gap-2 rounded-xl border border-line-strong px-3.5 text-sm hover:bg-surface"
          >
            {t("myOrders")}
          </Link>
        </header>
        <form
          key={`${query.category ?? ""}${query.q ?? ""}`}
          id="freelance-filters"
          action=""
          className="flex flex-col gap-3"
        >
          {query.category ? (
            <input type="hidden" name="category" value={query.category} />
          ) : null}
          <label className="sr-only" htmlFor="freelance-q">
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
              id="freelance-q"
              name="q"
              type="search"
              defaultValue={query.q ?? ""}
              placeholder={t("v2.searchPlaceholder")}
              className="min-h-11 min-w-0 flex-1 bg-transparent text-[15px] placeholder:text-fg-subtle focus-visible:outline-none"
            />
            <Link
              href="/chat"
              {...navForward}
              className="flex min-h-9 shrink-0 items-center rounded-xl px-3 text-sm font-medium hover:bg-surface-2"
            >
              {t("v2.pickWithSpoki")}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <nav
              aria-label={t("category")}
              className="flex max-w-full flex-1 gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1"
            >
              <Link
                href={queryString(query, { category: undefined, page: 1 })}
                aria-current={query.category ? undefined : "page"}
                className={seg(!query.category)}
              >
                {t("v2.all")}
              </Link>
              {FREELANCE_CATEGORIES.map((category) => (
                <Link
                  key={category}
                  href={queryString(query, { category, page: 1 })}
                  aria-current={
                    query.category === category ? "page" : undefined
                  }
                  className={seg(query.category === category)}
                >
                  {t(`categories.${category}`)}
                </Link>
              ))}
            </nav>
            <details className="relative">
              <summary
                className={`flex h-9 cursor-pointer list-none items-center rounded-full border px-3.5 text-sm hover:border-fg-subtle ${extra.length > 0 ? "border-accent bg-surface-2" : "border-line-strong bg-surface"}`}
              >
                {extra.length > 0
                  ? `${t("v2.more")} · ${extra.length}`
                  : t("v2.more")}
              </summary>
              <div className="absolute top-11 right-0 z-30 grid w-[min(92vw,480px)] gap-3 rounded-2xl border border-line-strong bg-surface p-4 shadow-xl sm:grid-cols-2">
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
                <Button type="submit" className="sm:col-span-2">
                  {t("applyFilters")}
                </Button>
              </div>
            </details>
          </div>
        </form>
        {banner(
          "/services",
          "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 7h18v13H3zM3 12h18",
          t("v2.turnkeyTitle"),
          t("v2.turnkeyText"),
        )}
        {banner(
          "/campaigns",
          "M4 6h11v12H4zM15 10l5-3v10l-5-3",
          t("ugcPromoTitle"),
          t("ugcPromoText"),
        )}
        {extra.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {extra.map((key) => (
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
            <p className="text-sm text-fg-muted" aria-live="polite">
              {t("v2.results", {
                count: total,
                sort: t(`sorts.${query.sort}`),
              })}
            </p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            text={active.length > 0 ? t("emptyFilteredText") : t("emptyText")}
            action={
              <Link href="/services" className={buttonClass("secondary")}>
                {t("teamLink")}
              </Link>
            }
          />
        )}
        {query.page > 1 || hasMore ? (
          <nav aria-label={t("pagination")} className="flex flex-wrap gap-3">
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
    </main>
  );
}
