import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EVENT_FORMATS, EVENT_KINDS, EVENT_TOPICS } from "@/config/events";
import { Button, buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { localePrefix } from "@/i18n/paths";
import {
  listEventCountries,
  parseEventSearch,
  searchEvents,
  type EventSearchQuery,
} from "@/modules/events/service";
import { EventCard } from "@/modules/events/ui/event-card";
import { FilterShell } from "@/modules/jobs/ui/filter-shell";
import { languageAlternates, siteUrl } from "@/modules/seo/site";

export const dynamic = "force-dynamic";

const FILTER_KEYS = [
  "q",
  "topic",
  "kind",
  "format",
  "country",
  "from",
  "to",
] as const;

function queryString(
  query: EventSearchQuery,
  changes: Partial<Record<keyof EventSearchQuery, string | number | undefined>>,
): string {
  const params = new URLSearchParams();
  const merged = { ...query, ...changes };
  for (const key of [...FILTER_KEYS, "page"] as const) {
    const value = merged[key];
    if (value === undefined || value === "") continue;
    if (key === "page" && Number(value) <= 1) continue;
    params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `/events?${text}` : "/events";
}

/** Catalog title and description for search (D413). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "events" });
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/events`,
      languages: languageAlternates("/events"),
    },
  };
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("events");
  const query = parseEventSearch(await searchParams);
  const { items, hasMore } = await searchEvents(query);
  const countries = await listEventCountries();
  const regionNames = new Intl.DisplayNames([intlLocale(locale)], {
    type: "region",
  });
  const countryName = (code: string) => regionNames.of(code) ?? code;
  const active = FILTER_KEYS.filter((key) => query[key] !== undefined);
  const chipLabel = (key: (typeof FILTER_KEYS)[number]): string => {
    const value = String(query[key]);
    if (key === "topic") return t(`topics.${value}`);
    if (key === "kind") return t(`kinds.${value}`);
    if (key === "format") return t(`formats.${value}`);
    if (key === "country") return countryName(value);
    if (key === "from") return `${t("from")} ${value}`;
    if (key === "to") return `${t("to")} ${value}`;
    return value;
  };

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader title={t("title")} intro={t("subtitle")} />
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
          <form id="event-filters" action="" className="flex flex-col gap-4">
            <FilterShell
              count={active.length}
              filtersLabel={t("filters")}
              closeLabel={t("closeFilters")}
            >
              <Field label={t("topic")}>
                <Select name="topic" defaultValue={query.topic ?? ""}>
                  <option value="">{t("anyTopic")}</option>
                  {EVENT_TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {t(`topics.${topic}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("kind")}>
                <Select name="kind" defaultValue={query.kind ?? ""}>
                  <option value="">{t("anyKind")}</option>
                  {EVENT_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {t(`kinds.${kind}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("format")}>
                <Select name="format" defaultValue={query.format ?? ""}>
                  <option value="">{t("anyFormat")}</option>
                  {EVENT_FORMATS.map((format) => (
                    <option key={format} value={format}>
                      {t(`formats.${format}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("country")}>
                <Select name="country" defaultValue={query.country ?? ""}>
                  <option value="">{t("anyCountry")}</option>
                  {countries
                    .map((code) => ({ code, name: countryName(code) }))
                    .sort((a, b) => a.name.localeCompare(b.name, locale))
                    .map(({ code, name }) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label={t("from")}>
                <Input
                  type="date"
                  name="from"
                  defaultValue={query.from ?? ""}
                />
              </Field>
              <Field label={t("to")}>
                <Input type="date" name="to" defaultValue={query.to ?? ""} />
              </Field>
              <Button type="submit">{t("applyFilters")}</Button>
            </FilterShell>
          </form>
          <div className="relative z-10 flex min-w-0 flex-col gap-4">
            <label className="sr-only" htmlFor="event-q">
              {t("search")}
            </label>
            <Input
              id="event-q"
              name="q"
              type="search"
              form="event-filters"
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
            {items.length > 0 ? (
              <ul className="grid gap-4">
                {items.map((event) => (
                  <li key={event.id}>
                    <EventCard event={event} locale={locale} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title={t("empty")} />
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
