import {
  test as base,
  expect,
  type Browser,
  type Page,
} from "@playwright/test";
import { randomInt } from "node:crypto";
import { CONSENT_POLICY_VERSION } from "../../src/lib/consent";

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
  // Choice, policy version and journal id (D220).
  value: `necessary~${CONSENT_POLICY_VERSION}~00000000-0000-4000-8000-000000000000`,
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

/** Opens the header account menu; "Sign out" lives there since D439. */
export async function openAccountMenu(page: Page) {
  await page.getByRole("button", { name: "Account", exact: true }).click();
  const menu = page.getByRole("navigation", { name: "Account" });
  await expect(menu.getByRole("button", { name: "Sign out" })).toBeVisible();
  return menu;
}

/** The signed-in header: the account menu offers "Sign out" (D439). */
export async function expectSignedInMenu(page: Page) {
  await openAccountMenu(page);
  await page.keyboard.press("Escape");
}

/** Signs out through the account menu (D439). */
export async function signOutFromMenu(page: Page) {
  const menu = await openAccountMenu(page);
  await menu.getByRole("button", { name: "Sign out" }).click();
}

export { expect } from "@playwright/test";
