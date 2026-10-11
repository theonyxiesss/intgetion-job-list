/**
 * Founder sites shown inside this site (D388).
 * This file is loaded from next.config through the page security policy,
 * so it must not import anything that needs a path alias.
 */

export const EMBEDDED_SITES = {
  company: "https://intgetion.vercel.app",
  portfolio: "https://theonyxis.vercel.app",
} as const;

/** Locales that have a URL prefix. English stays at the root (D335). */
export const PREFIXED_LOCALES = ["ru", "es", "pt-BR", "de", "fr", "it"] as const;

const EMBEDDED_ORIGINS = new Set<string>(Object.values(EMBEDDED_SITES));

export function isEmbeddedOrigin(origin: string): boolean {
  return EMBEDDED_ORIGINS.has(origin);
}

/** The one origin this path may frame, or nothing. */
export function embedOriginForPath(pathname: string): string | undefined {
  let path = pathname;
  for (const locale of PREFIXED_LOCALES) {
    const prefix = `/${locale}`;
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      path = path.slice(prefix.length) || "/";
      break;
    }
  }
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/company") return EMBEDDED_SITES.company;
  if (path === "/portfolio") return EMBEDDED_SITES.portfolio;
  return undefined;
}
