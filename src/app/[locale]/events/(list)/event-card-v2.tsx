// v2 (UI_V2) event card; the module card stays as it is (frozen module).
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { intlLocale } from "@/i18n/locale";
import type { PublicEvent } from "@/modules/events/service";
import { eventDateRange } from "@/modules/events/service";
import { isoDay } from "@/modules/events/service/format";
import { eventPlace } from "@/modules/events/ui/event-card";

/** v2 (UI_V2) card: date tile and source line. */
export async function EventCardV2({
  event,
  locale,
}: {
  event: PublicEvent;
  locale: string;
}) {
  const t = await getTranslations("events");
  const place = eventPlace(event, locale, t("online"));
  const dateRange = eventDateRange(event, intlLocale(locale));
  const dateParts = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: event.allDay ? "UTC" : (event.timeZone ?? "UTC"),
  }).formatToParts(event.startsAt);
  const day = dateParts.find((part) => part.type === "day")?.value;
  const month = dateParts.find((part) => part.type === "month")?.value;
  const date = event.allDay
    ? isoDay(event.startsAt)
    : event.startsAt.toISOString();
  const time = event.allDay
    ? dateRange
    : new Intl.DateTimeFormat(intlLocale(locale), {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: event.timeZone ?? "UTC",
        timeZoneName: "short",
      }).format(event.startsAt);
  return (
    <article className="flex items-center gap-4 rounded-[18px] border border-line bg-surface p-4">
      {day && month ? (
        <div
          aria-hidden="true"
          className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-line-strong bg-surface-2"
        >
          <span className="text-lg leading-none font-semibold">{day}</span>
          <span className="mt-0.5 text-[11px] text-fg-subtle">{month}</span>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="truncate text-[15px] font-semibold">
          <Link href={`/events/${event.slug}`} className="hover:underline">
            {event.title}
          </Link>
        </h2>
        <p className="text-sm text-fg-muted">
          {[place || t(`formats.${event.format}`), null]
            .filter(Boolean)
            .join("")}
          {" · "}
          <time dateTime={date}>{time}</time>
        </p>
        <p className="text-xs text-fg-subtle">
          {t("sourceLabel")}: {event.source.name}
        </p>
      </div>
      <Link
        href={`/events/${event.slug}`}
        className="flex min-h-10 shrink-0 items-center rounded-xl bg-fg px-4 text-sm font-semibold text-bg hover:opacity-90"
      >
        {t("v2.details")}
      </Link>
    </article>
  );
}
