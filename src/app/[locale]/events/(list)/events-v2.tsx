// v2 (UI_V2) layout of this route; page.tsx renders it when the flag is on.
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EVENT_KINDS, EVENT_TOPICS } from "@/config/events";
import { Button, buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import {
  listEventCountries,
  parseEventSearch,
  searchEvents,
  type EventSearchQuery,
} from "@/modules/events/service";
import { EventCardV2 } from "./event-card-v2";

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

/** Catalog title and description for search (D435). */

export async function EventsPageV2({
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

  const seg = (on: boolean) =>
    `rounded-lg px-3 py-1.5 text-sm whitespace-nowrap ${on ? "bg-surface font-medium text-fg" : "text-fg-muted hover:text-fg"}`;
  const topics = EVENT_TOPICS.slice(0, 4);

  return (
    <main className="px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto grid max-w-[1180px] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-wrap items-center gap-3">
            <h1 className="mr-auto text-[22px] font-semibold tracking-tight">
              {t("v2.title")}
            </h1>
            <Link
              href="/chat"
              {...navForward}
              className="flex min-h-10 items-center rounded-xl border border-line-strong px-4 text-sm font-medium hover:bg-surface"
            >
              {t("v2.pickWithSpoki")}
            </Link>
          </header>
          <div className="flex flex-wrap items-center gap-2">
            <nav
              aria-label={t("format")}
              className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
            >
              <Link
                href={queryString(query, { format: undefined, page: 1 })}
                aria-current={!query.format ? "page" : undefined}
                className={seg(!query.format)}
              >
                {t("v2.all")}
              </Link>
              {(["online", "offline"] as const).map((format) => (
                <Link
                  key={format}
                  href={queryString(query, { format, page: 1 })}
                  aria-current={query.format === format ? "page" : undefined}
                  className={seg(query.format === format)}
                >
                  {t(`formats.${format}`)}
                </Link>
              ))}
            </nav>
            <nav
              aria-label={t("topic")}
              className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface-2 p-1"
            >
              <Link
                href={queryString(query, { topic: undefined, page: 1 })}
                aria-current={!query.topic ? "page" : undefined}
                className={seg(!query.topic)}
              >
                {t("anyTopic")}
              </Link>
              {topics.map((topic) => (
                <Link
                  key={topic}
                  href={queryString(query, { topic, page: 1 })}
                  aria-current={query.topic === topic ? "page" : undefined}
                  className={seg(query.topic === topic)}
                >
                  {t(`topics.${topic}`)}
                </Link>
              ))}
            </nav>
            <details className="relative">
              <summary
                className={`flex h-9 cursor-pointer list-none items-center rounded-full border px-3.5 text-sm hover:border-fg-subtle ${active.length > 0 ? "border-accent bg-surface-2" : "border-line-strong bg-surface"}`}
              >
                {active.length > 0
                  ? `${t("v2.more")} · ${active.length}`
                  : t("v2.more")}
              </summary>
              <form
                id="event-filters"
                action=""
                className="absolute top-11 left-0 z-30 grid w-[min(92vw,560px)] gap-3 rounded-2xl border border-line-strong bg-surface p-4 shadow-xl sm:grid-cols-2"
              >
                <Field label={t("search")} className="sm:col-span-2">
                  <Input
                    name="q"
                    type="search"
                    defaultValue={query.q ?? ""}
                    placeholder={t("search")}
                  />
                </Field>
                {query.format ? (
                  <input type="hidden" name="format" value={query.format} />
                ) : null}
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
                <Button type="submit" className="sm:col-span-2">
                  {t("applyFilters")}
                </Button>
              </form>
            </details>
          </div>
          {active.filter((key) => key !== "format" && key !== "topic").length >
          0 ? (
            <ul className="flex flex-wrap gap-2">
              {active
                .filter((key) => key !== "format" && key !== "topic")
                .map((key) => (
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
          <section aria-label={t("v2.title")} className="flex flex-col gap-2.5">
            {items.length > 0 ? (
              <ul className="flex flex-col gap-2.5">
                {items.map((event) => (
                  <li key={event.id}>
                    <EventCardV2 event={event} locale={locale} />
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
          </section>
        </div>
        <aside className="flex min-w-0 flex-col gap-3">
          <section className="flex gap-3 rounded-[18px] border border-line bg-surface p-4">
            <span
              aria-hidden="true"
              className="mt-1 size-2 shrink-0 rounded-full bg-accent"
            />
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-sm text-fg-muted">{t("networking")}</p>
              <Link
                href="/chat"
                {...navForward}
                className="self-start text-sm font-medium text-accent"
              >
                {t("v2.pickWithSpoki")} →
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
