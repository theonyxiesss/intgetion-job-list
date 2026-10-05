import { describe, expect, it } from "vitest";
import {
  ACCEPT_ALL,
  CONSENT_MAX_AGE_SECONDS,
  NECESSARY_ONLY,
  consentAllows,
  consentCookie,
  cookiesToDelete,
  parseConsent,
  readConsent,
  readCookie,
  serializeConsent,
} from "./consent";

describe("cookie consent by category (D201, D219)", () => {
  it("keeps the two values written before categories existed", () => {
    expect(readConsent("a=1; cookie_consent=all; b=2")).toEqual(ACCEPT_ALL);
    expect(readConsent("cookie_consent=necessary")).toEqual(NECESSARY_ONLY);
  });

  it("reads a partial choice and refuses anything unknown", () => {
    expect(parseConsent("preferences")).toEqual({
      preferences: true,
      analytics: false,
    });
    expect(parseConsent("analytics")).toEqual({
      preferences: false,
      analytics: true,
    });
    expect(parseConsent("yes")).toBeNull();
    expect(parseConsent("preferences+ads")).toBeNull();
    expect(parseConsent("ALL")).toBeNull();
    expect(readConsent("")).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });

  it("round-trips every combination", () => {
    for (const preferences of [false, true]) {
      for (const analytics of [false, true]) {
        const consent = { preferences, analytics };
        expect(parseConsent(serializeConsent(consent))).toEqual(consent);
      }
    }
    expect(serializeConsent(NECESSARY_ONLY)).toBe("necessary");
    expect(serializeConsent(ACCEPT_ALL)).toBe("all");
  });

  it("allows a category only after an explicit yes", () => {
    expect(consentAllows(ACCEPT_ALL, "preferences")).toBe(true);
    expect(consentAllows(NECESSARY_ONLY, "preferences")).toBe(false);
    expect(
      consentAllows({ preferences: true, analytics: false }, "analytics"),
    ).toBe(false);
    expect(consentAllows(null, "analytics")).toBe(false);
  });

  it("deletes the cookies of a withdrawn category", () => {
    expect(cookiesToDelete(NECESSARY_ONLY)).toEqual(["last_catalog_query"]);
    expect(cookiesToDelete(ACCEPT_ALL)).toEqual([]);
  });

  it("writes a one-year Lax cookie, Secure only on https", () => {
    expect(consentCookie(NECESSARY_ONLY, false)).toBe(
      `cookie_consent=necessary; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`,
    );
    expect(consentCookie(ACCEPT_ALL, true)).toMatch(/; Secure$/);
  });

  it("reads any cookie by name", () => {
    expect(readCookie("a=1; b=x=y", "b")).toBe("x=y");
    expect(readCookie("a=1", "b")).toBeNull();
  });
});
