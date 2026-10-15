import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Badge, Tag } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { navBack } from "@/components/ui/page-transition";
import { Stat, StatRow } from "@/components/ui/stat";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import { localePrefix } from "@/i18n/paths";
import { publicHttpUrl } from "@/lib/company-mark";
import {
  eventDateRange,
  eventJsonLd,
  getEventBySlug,
  type PublicEvent,
} from "@/modules/events/service";
import { eventPlace } from "@/modules/events/ui/event-card";
import { JsonLd } from "@/modules/seo/json-ld";
import { breadcrumbListJsonLd } from "@/modules/seo/markup";
import {
  languageAlternates,
  metaDescription,
  siteUrl,
} from "@/modules/seo/site";

export const dynamic = "force-dynamic";

async function summaryOf(event: PublicEvent, locale: string) {
  const t = await getTranslations({ locale, namespace: "events" });
  return t("metaDescription", {
    kind: t(`kinds.${event.kind}`),
    dates: eventDateRange(event, intlLocale(locale)),
    place: eventPlace(event, locale, t("online")),
  });
}

/** Event title, description and canonical for search (D413). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  const description = metaDescription(
    event.description || (await summaryOf(event, locale)),
  );
  return {
    title: event.title,
    description,
    alternates: {
      canonical: `${siteUrl()}${localePrefix(locale)}/events/${event.slug}`,
      languages: languageAlternates(`/events/${event.slug}`),
    },
    openGraph: { type: "website", title: event.title, description },
    // A past event stays reachable for old links but leaves the index.
    ...(event.status === "expired" ? { robots: { index: false } } : {}),
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const t = await getTranslations("events");
  const seo = await getTranslations("seo");
  const nav = await getTranslations("nav");
  const pageUrl = `${siteUrl()}${localePrefix(locale)}/events/${event.slug}`;
  const ended = event.status === "expired" || event.endsAt < new Date();
  const organizerHref = publicHttpUrl(event.url);
  const cfpHref =
    !ended && event.cfpEndsAt && event.cfpEndsAt > new Date()
      ? publicHttpUrl(event.cfpUrl)
      : null;
  const sourceHref = publicHttpUrl(event.source.url);
  const summary = await summaryOf(event, locale);
  const dates = eventDateRange(event, intlLocale(locale));
  const place = eventPlace(event, locale, t("online"));

  return (
    <main className="py-10 md:py-16">
      {ended ? null : <JsonLd data={eventJsonLd(event, pageUrl, summary)} />}
      <JsonLd
        data={breadcrumbListJsonLd([
          { name: seo("home"), url: `${siteUrl()}${localePrefix(locale)}` },
          {
            name: nav("events"),
            url: `${siteUrl()}${localePrefix(locale)}/events`,
          },
          { name: event.title, url: pageUrl },
        ])}
      />
      <Container className="flex flex-col gap-8">
        <Link
          href="/events"
          {...navBack}
          className="t-label inline-flex min-h-11 items-center self-start text-fg-muted"
        >
          {t("back")}
        </Link>
        <article className="flex max-w-[860px] flex-col gap-8">
          <header className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="t-label text-fg-muted">
                {t(`kinds.${event.kind}`)}
              </p>
              <Badge>{t(`formats.${event.format}`)}</Badge>
            </div>
            <h1 className="t-display-l">{event.title}</h1>
            {ended ? (
              <p className="t-body-s text-fg-muted" role="status">
                {t("ended")}
              </p>
            ) : null}
          </header>
          <StatRow>
            <Stat label={t("when")} value={dates} />
            <Stat label={t("where")} value={place || "—"} muted={!place} />
            <Stat label={t("format")} value={t(`formats.${event.format}`)} />
            <Stat label={t("kind")} value={t(`kinds.${event.kind}`)} />
          </StatRow>
          {event.topics.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="t-label text-fg-muted">{t("topicsLabel")}</h2>
              <ul className="flex flex-wrap gap-2">
                {event.topics.map((topic) => (
                  <li key={topic}>
                    <Link
                      href={`/events?topic=${topic}`}
                      className="inline-flex"
                    >
                      <Tag>{t(`topics.${topic}`)}</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {event.description ? (
            <div className="t-body-l max-w-[68ch] whitespace-pre-wrap">
              {event.description}
            </div>
          ) : null}
          <p className="max-w-[68ch] text-fg-muted">{t("networking")}</p>
          {organizerHref && !ended ? (
            <div className="flex flex-col gap-2">
              <a
                href={organizerHref}
                rel="noopener noreferrer"
                className={`${buttonClass("primary")} self-start`}
              >
                {t("visit")}
              </a>
              <p className="t-body-s text-fg-muted">{t("organizerNote")}</p>
            </div>
          ) : null}
          {cfpHref && event.cfpEndsAt ? (
            <a
              href={cfpHref}
              rel="noopener noreferrer"
              className="t-body-s self-start underline underline-offset-4"
            >
              {t("cfp", {
                date: eventDateRange(
                  {
                    startsAt: event.cfpEndsAt,
                    endsAt: event.cfpEndsAt,
                    allDay: true,
                    timeZone: null,
                  },
                  intlLocale(locale),
                ),
              })}
            </a>
          ) : null}
          <div className="flex flex-col gap-1 border-t border-line pt-4">
            <p className="t-label text-fg-muted">{t("sourceLabel")}</p>
            {sourceHref ? (
              <a
                href={sourceHref}
                rel="noopener noreferrer"
                className="t-body-s inline-flex min-h-11 items-center self-start underline underline-offset-4"
              >
                {event.source.name}
              </a>
            ) : (
              <p className="t-body-s">{event.source.name}</p>
            )}
          </div>
        </article>
      </Container>
    </main>
  );
}
