import { test as base, type Browser } from "@playwright/test";
import { randomInt } from "node:crypto";

/**
 * Every test gets its own client IP (D46). CI requests carry no proxy
 * address, so without this all tests share one rate-limit bucket and the
 * per-IP registration limit (10 per hour) runs out after a few runs.
 * 198.18.0.0/15 is reserved for benchmarks (RFC 2544).
 */
export function testIp(): string {
  return `198.${18 + randomInt(2)}.${randomInt(256)}.${1 + randomInt(254)}`;
}

/** Tests start with the cookie choice made, so the banner covers nothing (D201). */
export const consentCookie = {
  name: "cookie_consent",
  value: "necessary",
  url: "http://127.0.0.1:3000",
};

export const test = base.extend({
  context: async ({ context }, provide) => {
    await context.addCookies([consentCookie]);
    await provide(context);
  },
  // Playwright calls the second argument `use`; another name keeps the React
  // hooks lint rule from mistaking it for a hook.
  extraHTTPHeaders: async ({ extraHTTPHeaders }, provide) => {
    await provide({ ...extraHTTPHeaders, "x-forwarded-for": testIp() });
  },
});

/** A second browser context that acts as another user from another IP. */
export async function newContextWithIp(browser: Browser) {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { "x-forwarded-for": testIp() },
  });
  await context.addCookies([consentCookie]);
  return context;
}

export { expect } from "@playwright/test";
