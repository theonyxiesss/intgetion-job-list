import { intlLocale } from "@/i18n/locale";
/** Whole US dollars, e.g. "$120,000" / "120 000 $". */
export function formatUsd(value: number, locale: string): string {
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
