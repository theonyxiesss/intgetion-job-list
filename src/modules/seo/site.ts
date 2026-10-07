import { localePrefix } from "@/i18n/paths";
/** Absolute site origin for SEO files (D210), without a trailing slash. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export const SEO_LOCALES = ["en", "ru"] as const;

/** Absolute URL of a path in a locale; English has no prefix (D335). */
export function localeUrl(locale: string, path = ""): string {
  return `${siteUrl()}${localePrefix(locale)}${path}`;
}

/**
 * hreflang alternates for one path, e.g. "/jobs". English also answers as
 * "x-default" — the page a visitor from any other language gets (D276).
 */
export function languageAlternates(path: string): Record<string, string> {
  return {
    ...Object.fromEntries(
      SEO_LOCALES.map((locale) => [locale, localeUrl(locale, path)]),
    ),
    "x-default": localeUrl("en", path),
  };
}

/** Private and service areas search engines should not crawl. */
export const ROBOTS_DISALLOW = [
  "/api/",
  "/*/admin",
  "/admin",
  "/*/employer",
  "/employer",
  "/*/settings",
  "/settings",
  "/*/profile",
  "/profile",
  "/*/applications",
  "/applications",
  "/*/saved-jobs",
  "/saved-jobs",
  "/*/saved-searches",
  "/saved-searches",
  "/*/notifications",
  "/notifications",
  "/*/matches",
  "/matches",
  "/*/contacts",
  "/contacts",
  "/*/onboarding",
  "/onboarding",
  "/*/post-job",
  "/post-job",
  "/*/auth/",
  "/auth/",
  "/*/unsubscribe",
  "/unsubscribe",
  "/*/dev/",
  "/dev/",
] as const;

/**
 * SEO-tool crawlers that copy whole sites into their databases; they bring
 * no visitors (P-SCRAPE, D218). Search engines are not on this list.
 */
export const BLOCKED_CRAWLERS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "DataForSeoBot",
  "serpstatbot",
  "Barkrowler",
  "PetalBot",
] as const;

/**
 * Crawlers that collect text for training AI models. Refused by the
 * founder's decision (D218); Google-Extended does not affect Google Search.
 */
export const AI_CRAWLERS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "Google-Extended",
  "CCBot",
] as const;

/**
 * A link no person sees (hidden in the footer) and every honest crawler is
 * told to skip: whoever requests it is a scraper ignoring robots.txt (D218).
 */
export const SCRAPER_TRAP_PATH = "/api/catalog-export";

/** First sentence-sized slice of a job description for <meta description>. */
export function metaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}

/**
 * Site ownership proofs for Search Console, Yandex Webmaster and Bing (D298).
 * Each is a token the founder pastes into an env variable; an empty one is
 * simply left out, so nothing fake ever reaches the page.
 */
export function siteVerification(): {
  google?: string;
  yandex?: string;
  other?: Record<string, string>;
} {
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const yandex = process.env.YANDEX_VERIFICATION?.trim();
  const bing = process.env.BING_SITE_VERIFICATION?.trim();
  return {
    ...(google ? { google } : {}),
    ...(yandex ? { yandex } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
  };
}
