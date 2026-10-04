/** Absolute site origin for SEO files (D210), without a trailing slash. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export const SEO_LOCALES = ["en", "ru"] as const;

/** hreflang alternates for one path, e.g. "/jobs". */
export function languageAlternates(path: string): Record<string, string> {
  const base = siteUrl();
  return Object.fromEntries(
    SEO_LOCALES.map((locale) => [locale, `${base}/${locale}${path}`]),
  );
}

/** Private and service areas search engines should not crawl. */
export const ROBOTS_DISALLOW = [
  "/api/",
  "/*/admin",
  "/*/employer",
  "/*/settings",
  "/*/profile",
  "/*/applications",
  "/*/saved-jobs",
  "/*/notifications",
  "/*/matches",
  "/*/contacts",
  "/*/onboarding",
  "/*/auth/",
  "/*/unsubscribe",
  "/*/dev/",
] as const;

/** First sentence-sized slice of a job description for <meta description>. */
export function metaDescription(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}
