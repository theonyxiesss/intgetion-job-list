import { routing } from "@/i18n/routing";

/**
 * `/billing/crypto`, including a language prefix. English has no prefix (D335).
 * Kept out of security-headers.ts: next.config loads that file before the `@/` alias exists.
 */
export function isCryptoPayPath(pathname: string): boolean {
  const prefixes = routing.locales
    .filter((locale) => locale !== routing.defaultLocale)
    .join("|");
  return new RegExp(`^/(?:(?:${prefixes})/)?billing/crypto/?$`).test(pathname);
}
