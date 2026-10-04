import { describe, expect, it } from "vitest";
import {
  CONSENT_MAX_AGE_SECONDS,
  consentAllows,
  consentCookie,
  parseConsent,
  readConsent,
} from "./consent";

describe("cookie consent (D201)", () => {
  it("reads the choice from a cookie header", () => {
    expect(readConsent("a=1; cookie_consent=all; b=2")).toBe("all");
    expect(readConsent("cookie_consent=necessary")).toBe("necessary");
    expect(readConsent("cookie_consent=yes")).toBeNull();
    expect(readConsent("")).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });

  it("allows optional cookies only after accept all", () => {
    expect(consentAllows("all")).toBe(true);
    expect(consentAllows("necessary")).toBe(false);
    expect(consentAllows(null)).toBe(false);
    expect(parseConsent("ALL")).toBeNull();
  });

  it("writes a one-year Lax cookie, Secure only on https", () => {
    expect(consentCookie("necessary", false)).toBe(
      `cookie_consent=necessary; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`,
    );
    expect(consentCookie("all", true)).toMatch(/; Secure$/);
  });
});
