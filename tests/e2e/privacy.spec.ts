import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

const password = "orbit-lantern-42";

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("10C: export my data, then delete the account", async ({ page }) => {
  await signUp(page, uniqueEmail("privacy"));

  await page.goto("/en/settings/privacy");
  await expect(
    page
      .getByRole("navigation", { name: "Settings" })
      .getByRole("link", { name: "Privacy", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download JSON" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^intgetion-export-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const exported = await page.request.get("/api/me/export");
  expect(exported.status()).toBe(200);
  const data = (await exported.json()) as {
    exportVersion: number;
    user: { id: string };
  };
  expect(data.exportVersion).toBe(1);
  expect(data.user.id).toBeTruthy();

  await page.goto("/en/settings/account");
  const remove = page.getByRole("button", { name: "Delete account" });
  await expect(remove).toBeDisabled();
  await page.getByLabel("Type DELETE to continue").fill("DELETE");
  await remove.click();
  await page.getByRole("button", { name: "Delete for good" }).click();
  await expect(page).toHaveURL(/\/en$/);
  expect((await page.request.get("/api/me")).status()).toBe(401);
});

test("10C: deleting needs the typed confirmation", async ({ page }) => {
  await signUp(page, uniqueEmail("privacy-confirm"));
  const response = await page.request.delete("/api/me", {
    data: { confirm: "yes" },
    headers: { origin: "http://127.0.0.1:3000" },
  });
  expect(response.status()).toBe(400);
  expect((await page.request.get("/api/me")).status()).toBe(200);
});
