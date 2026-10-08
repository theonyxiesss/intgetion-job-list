import { routing, type AppLocale } from "./routing";

/** D336: any stored or requested language, narrowed to one the site has. */
export function isAppLocale(value: unknown): value is AppLocale {
  return (routing.locales as readonly unknown[]).includes(value);
}

export function toAppLocale(value: unknown): AppLocale {
  return isAppLocale(value) ? value : routing.defaultLocale;
}

/** BCP 47 tag for Intl number and date formatting. */
export function intlLocale(locale: string): string {
  switch (locale) {
    case "ru":
      return "ru-RU";
    case "es":
      return "es-ES";
    case "pt-BR":
      return "pt-BR";
    default:
      return "en-US";
  }
}
