import { routing, type AppLocale } from "./routing";

/**
 * English lives at the root (`/jobs`), every other language under its
 * prefix (`/ru/jobs`). Build site URLs with this instead of `/${locale}` so
 * links, canonicals and emails never take the `/en/...` → `/...` redirect.
 */
export function localePrefix(locale: string): string {
  return locale === routing.defaultLocale ? "" : `/${locale}`;
}

/** Path for a locale, e.g. `("ru", "/jobs")` → `/ru/jobs`, `("en", "")` → `/`. */
export function localePath(locale: AppLocale | string, path = ""): string {
  return `${localePrefix(locale)}${path}` || "/";
}

/** The public home page, in any locale. English is `/` (D335). */
export function isSiteHome(pathname: string): boolean {
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") || "/";
  if (path === "/") return true;
  return routing.locales.some((locale) => path === `/${locale}`);
}
