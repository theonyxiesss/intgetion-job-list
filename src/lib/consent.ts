/**
 * Cookie consent by category (D201, D219). Necessary cookies (session,
 * language, bot session, this choice) are always on. Optional ones:
 * "preferences" — remembering things like the last catalog filters;
 * "analytics" — our own usage statistics (none are collected yet).
 * Anything optional must check `consentAllows` and write nothing without it.
 */
export const CONSENT_COOKIE = "cookie_consent";
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export const CONSENT_CATEGORIES = ["preferences", "analytics"] as const;
export type ConsentCategory = (typeof CONSENT_CATEGORIES)[number];

export type Consent = Record<ConsentCategory, boolean>;

export const NECESSARY_ONLY: Consent = { preferences: false, analytics: false };
export const ACCEPT_ALL: Consent = { preferences: true, analytics: true };

/**
 * Cookies that exist only with consent, by category: withdrawing consent
 * deletes them (D219).
 */
export const OPTIONAL_COOKIES: Record<ConsentCategory, readonly string[]> = {
  preferences: ["last_catalog_query"],
  analytics: [],
};

/**
 * Cookie values: "necessary" and "all" (as before D219), or the allowed
 * categories joined by "+", e.g. "preferences".
 */
export function parseConsent(value: string | null | undefined): Consent | null {
  if (value === "necessary") return { ...NECESSARY_ONLY };
  if (value === "all") return { ...ACCEPT_ALL };
  if (!value) return null;
  const parts = value.split("+");
  if (
    !parts.every((part) =>
      (CONSENT_CATEGORIES as readonly string[]).includes(part),
    )
  ) {
    return null;
  }
  return {
    preferences: parts.includes("preferences"),
    analytics: parts.includes("analytics"),
  };
}

export function serializeConsent(consent: Consent): string {
  const allowed = CONSENT_CATEGORIES.filter((category) => consent[category]);
  if (allowed.length === 0) return "necessary";
  if (allowed.length === CONSENT_CATEGORIES.length) return "all";
  return allowed.join("+");
}

/** Reads the choice from a `Cookie` header or `document.cookie`. */
export function readConsent(
  cookieHeader: string | null | undefined,
): Consent | null {
  return parseConsent(readCookie(cookieHeader, CONSENT_COOKIE));
}

export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

/** An optional category is allowed only after an explicit yes. */
export function consentAllows(
  consent: Consent | null,
  category: ConsentCategory,
): boolean {
  return consent?.[category] === true;
}

export function consentCookie(consent: Consent, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${serializeConsent(consent)}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Optional cookies the new choice no longer allows. */
export function cookiesToDelete(consent: Consent): string[] {
  return CONSENT_CATEGORIES.filter((category) => !consent[category]).flatMap(
    (category) => [...OPTIONAL_COOKIES[category]],
  );
}

/** Browser only: stores the choice for a year and deletes what it revokes. */
export function writeConsent(consent: Consent): void {
  const secure = window.location.protocol === "https:";
  document.cookie = consentCookie(consent, secure);
  for (const name of cookiesToDelete(consent)) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}
