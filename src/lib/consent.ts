/**
 * Cookie consent (D201). "necessary" — only the cookies the site needs
 * (session, language, bot session); "all" — optional ones too. There are
 * no optional cookies yet: future analytics must check `consentAllows`.
 */
export const CONSENT_COOKIE = "cookie_consent";
export const CONSENT_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

export type Consent = "all" | "necessary";

export function parseConsent(value: string | null | undefined): Consent | null {
  return value === "all" || value === "necessary" ? value : null;
}

/** Reads the choice from a `Cookie` header or `document.cookie`. */
export function readConsent(
  cookieHeader: string | null | undefined,
): Consent | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CONSENT_COOKIE) return parseConsent(rest.join("="));
  }
  return null;
}

/** Optional (non-necessary) cookies are allowed only after "all". */
export function consentAllows(consent: Consent | null): boolean {
  return consent === "all";
}

export function consentCookie(consent: Consent, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${consent}`,
    "Path=/",
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    "SameSite=Lax",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

/** Browser only: stores the choice for a year. */
export function writeConsent(consent: Consent): void {
  document.cookie = consentCookie(
    consent,
    window.location.protocol === "https:",
  );
}
