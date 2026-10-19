import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { ListingCard } from "@/components/ui/listing-card";
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

/** One event in the catalog (D435), on the shared card (D479). */
export async function EventCard({
  event,
  locale,
}: {
  event: PublicEvent;
  locale: string;
}) {
  const t = await getTranslations("events");
  const place = eventPlace(event, locale, t("online"));
  return (
    <ListingCard
      href={`/events/${event.slug}`}
      title={event.title}
      headingLevel={2}
      label={t(`kinds.${event.kind}`)}
      badges={<Badge>{t(`formats.${event.format}`)}</Badge>}
      facts={place ? [place] : []}
      tags={event.topics.map((topic) => t(`topics.${topic}`))}
      lead={
        <p className="t-data text-fg">
          <time
            dateTime={
              event.allDay
                ? isoDay(event.startsAt)
                : event.startsAt.toISOString()
            }
          >
            {eventDateRange(event, intlLocale(locale))}
          </time>
        </p>
      }
      viewLabel={t("viewEvent")}
    />
  );
}
