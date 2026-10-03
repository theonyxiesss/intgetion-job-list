import { expect, test, type Page } from "@playwright/test";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 2B: a confirmed user fills a profile and completeness rises.
 * P1: another candidate reading that profile gets 404 and no contacts.
 */

const password = "orbit-lantern-42";
const sameOrigin = { origin: "http://127.0.0.1:3000" };

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

async function registerWithPassword(page: Page, email: string) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
}

async function confirmEmail(page: Page, email: string) {
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("profile completeness grows, and another candidate gets 404 without contacts", async ({
  page,
  browser,
}) => {
  test.setTimeout(90_000);
  const email = uniqueEmail("profile");
  const contactEmail = `contacts-${email}`;
  await registerWithPassword(page, email);
  await confirmEmail(page, email);

  await page.goto("/en/profile");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );

  await page.goto("/en/profile/edit");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Headline").fill("Engineer");
  await page.getByLabel("Desired titles").fill("Backend engineer");
  await page.getByRole("textbox", { name: /^Timezone/ }).fill("Europe/Berlin");
  await page.getByLabel("I confirm this timezone").check();
  await page.getByLabel("Years of experience").fill("5");
  await page
    .getByRole("textbox", { name: /^Skills/ })
    .fill("React, TypeScript, Python");
  await page.getByLabel("Language code").fill("en");
  await page.getByLabel("Minimum salary, minor units").fill("100000");
  await page.getByLabel("Salary currency").fill("EUR");
  await page.getByLabel("Contact email").fill(contactEmail);
  await page.getByRole("button", { name: "Save profile" }).click();

  await expect(page).toHaveURL(/\/en\/profile$/);
  const score = await page
    .getByRole("progressbar")
    .getAttribute("aria-valuenow");
  expect(Number(score)).toBeGreaterThan(0);

  const me = await page.request.get("/api/me");
  const ownerId = ((await me.json()) as { id: string }).id;
  const own = await page.request.get(`/api/candidates/${ownerId}`);
  expect(own.status()).toBe(200);
  const ownBody = await own.json();
  expect(ownBody).not.toHaveProperty("contacts");
  expect(JSON.stringify(ownBody)).not.toContain(contactEmail);

  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  const otherEmail = uniqueEmail("profile-b");
  await registerWithPassword(other, otherEmail);
  await confirmEmail(other, otherEmail);
  const hidden = await other.request.get(`/api/candidates/${ownerId}`, {
    headers: sameOrigin,
  });
  expect(hidden.status()).toBe(404);
  const hiddenText = await hidden.text();
  expect(hiddenText).not.toContain(contactEmail);
  expect(hiddenText).not.toContain('"contacts"');
  await otherContext.close();
});
