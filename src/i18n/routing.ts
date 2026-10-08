import { defineRouting } from "next-intl/routing";

/** next-intl's cookie for the chosen language (D335). */
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const routing = defineRouting({
  locales: ["en", "ru", "es", "pt-BR"],
  defaultLocale: "en",
  // D335: English at the root, Russian under /ru.
  localePrefix: "as-needed",
  // Remember an explicit choice for a year; the browser language is the
  // first guess only.
  localeCookie: { name: LOCALE_COOKIE, maxAge: LOCALE_COOKIE_MAX_AGE },
});

export type AppLocale = (typeof routing.locales)[number];
