import { describe, expect, it } from "vitest";
import {
  ACCEPT_ALL,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_POLICY_VERSION,
  NECESSARY_ONLY,
  applyGpc,
  consentAllows,
  consentCookie,
  cookiesToDelete,
  parseChoice,
  parseConsentCookie,
  readConsent,
  readCookie,
  serializeChoice,
} from "./consent";

const id = "0b6f6f3e-5d1c-4a8e-9a37-1b2c3d4e5f60";
const current = (choice: string) =>
  `cookie_consent=${choice}~${CONSENT_POLICY_VERSION}~${id}`;

describe("cookie consent by category (D201, D219, D220)", () => {
  it("reads the choice made under the current policy", () => {
    expect(readConsent(`a=1; ${current("all")}; b=2`)).toEqual(ACCEPT_ALL);
    expect(readConsent(current("necessary"))).toEqual(NECESSARY_ONLY);
    expect(readConsent(current("preferences"))).toEqual({
      preferences: true,
      analytics: false,
    });
  });

  it("asks again after a policy change or for a value from before D220", () => {
    expect(readConsent("cookie_consent=all")).toBeNull();
    expect(readConsent(`cookie_consent=all~2020-01-01~${id}`)).toBeNull();
    expect(
      readConsent(`cookie_consent=all~${CONSENT_POLICY_VERSION}~x`),
    ).toBeNull();
    expect(readConsent("")).toBeNull();
    expect(readConsent(undefined)).toBeNull();
  });

  it("refuses unknown categories", () => {
    expect(parseChoice("yes")).toBeNull();
    expect(parseChoice("preferences+ads")).toBeNull();
    expect(parseChoice("ALL")).toBeNull();
  });

  it("round-trips every combination", () => {
    for (const preferences of [false, true]) {
      for (const analytics of [false, true]) {
        const consent = { preferences, analytics };
        expect(parseChoice(serializeChoice(consent))).toEqual(consent);
      }
    }
    expect(serializeChoice(NECESSARY_ONLY)).toBe("necessary");
    expect(serializeChoice(ACCEPT_ALL)).toBe("all");
  });

  it("allows a category only after an explicit yes", () => {
    expect(consentAllows(ACCEPT_ALL, "preferences")).toBe(true);
    expect(consentAllows(NECESSARY_ONLY, "preferences")).toBe(false);
    expect(
      consentAllows({ preferences: true, analytics: false }, "analytics"),
    ).toBe(false);
    expect(consentAllows(null, "analytics")).toBe(false);
  });

  it("treats Global Privacy Control as a standing no to analytics", () => {
    expect(consentAllows(ACCEPT_ALL, "analytics", { gpc: true })).toBe(false);
    expect(consentAllows(ACCEPT_ALL, "preferences", { gpc: true })).toBe(true);
    expect(applyGpc(ACCEPT_ALL, true)).toEqual({
      preferences: true,
      analytics: false,
    });
    expect(applyGpc(ACCEPT_ALL, false)).toEqual(ACCEPT_ALL);
  });

  it("deletes the cookies of a withdrawn category", () => {
    expect(cookiesToDelete(NECESSARY_ONLY)).toEqual([
      "last_catalog_query",
      "recent_jobs",
      "_ia",
    ]);
    expect(cookiesToDelete({ preferences: true, analytics: false })).toEqual([
      "_ia",
    ]);
    expect(cookiesToDelete(ACCEPT_ALL)).toEqual([]);
  });

  it("writes choice, policy version and record id in a one-year Lax cookie", () => {
    const record = {
      consent: NECESSARY_ONLY,
      version: CONSENT_POLICY_VERSION,
      id,
    };
    expect(consentCookie(record, false)).toBe(
      `${current("necessary")}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`,
    );
    expect(consentCookie(record, true)).toMatch(/; Secure$/);
    expect(
      parseConsentCookie(`necessary~${CONSENT_POLICY_VERSION}~${id}`),
    ).toEqual(record);
  });

  it("reads any cookie by name", () => {
    expect(readCookie("a=1; b=x=y", "b")).toBe("x=y");
    expect(readCookie("a=1", "b")).toBeNull();
  });
});
