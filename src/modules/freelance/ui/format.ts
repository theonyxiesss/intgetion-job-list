import { intlLocale } from "@/i18n/locale";
import { formatMinor } from "@/lib/money";
import { isValidTimeZone, timeZoneOffsetMinutes } from "@/lib/tz";

/** "$450", "$450.50" in the reader's language. */
export function formatUsd(minor: bigint, locale: string): string {
  return formatMinor(minor, "USD", intlLocale(locale), { wholeWhenEven: true });
}

/** "UTC+3", "UTC−5", "UTC+5:30" for the zone right now. */
export function utcLabel(timeZone: string, now: Date = new Date()): string {
  if (!isValidTimeZone(timeZone)) return timeZone;
  const minutes = timeZoneOffsetMinutes(now, timeZone);
  if (minutes === 0) return "UTC";
  const sign = minutes > 0 ? "+" : "−";
  const abs = Math.abs(minutes);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, "0")}` : ""}`;
}

/** Language names in the reader's language: ["ru", "en"] → "Russian, English". */
export function languageNames(
  codes: readonly string[],
  locale: string,
): string {
  const names = new Intl.DisplayNames([intlLocale(locale)], {
    type: "language",
  });
  return codes.map((code) => names.of(code) ?? code).join(", ");
}
