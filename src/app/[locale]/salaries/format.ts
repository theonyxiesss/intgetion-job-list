/** Whole US dollars, e.g. "$120,000" / "120 000 $". */
export function formatUsd(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
