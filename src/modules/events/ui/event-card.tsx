import { getTranslations } from "next-intl/server";
import { Badge, Tag } from "@/components/ui/badge";
import { navForward } from "@/components/ui/page-transition";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import type { PublicEvent } from "../service";
import { eventDateRange } from "../service";
import { isoDay } from "../service/format";

/** Where, in words: city and country in the reader's language, or online. */
export function eventPlace(
  event: Pick<PublicEvent, "city" | "country" | "format">,
  locale: string,
  onlineLabel: string,
): string {
  const country = event.country
    ? (new Intl.DisplayNames([intlLocale(locale)], { type: "region" }).of(
        event.country,
      ) ?? event.country)
    : null;
  const place = [event.city, country].filter(Boolean).join(", ");
  if (event.format === "online") return onlineLabel;
  if (event.format === "hybrid") {
    return place ? `${place} · ${onlineLabel}` : onlineLabel;
  }
  return place;
}

/** One event in the catalog (D413). The title links to our event page. */
export async function EventCard({
  event,
  locale,
}: {
  event: PublicEvent;
  locale: string;
}) {
  const t = await getTranslations("events");
  return (
    <article className="flex flex-col gap-3 border border-line bg-surface p-4 transition-colors hover:border-line-strong md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="t-label text-fg-muted">{t(`kinds.${event.kind}`)}</p>
        <Badge>{t(`formats.${event.format}`)}</Badge>
      </div>
      <h2 className="t-h3">
        <Link
          href={`/events/${event.slug}`}
          {...navForward}
          className="underline-offset-4 hover:underline"
        >
          {event.title}
        </Link>
      </h2>
      <p className="t-data text-fg">
        <time
          dateTime={
            event.allDay ? isoDay(event.startsAt) : event.startsAt.toISOString()
          }
        >
          {eventDateRange(event, intlLocale(locale))}
        </time>
      </p>
      <p className="t-body-s text-fg-muted">
        {eventPlace(event, locale, t("online"))}
      </p>
      {event.topics.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label={t("topicsLabel")}>
          {event.topics.map((topic) => (
            <li key={topic}>
              <Tag>{t(`topics.${topic}`)}</Tag>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
