import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { authLink, waitForMail } from "./mail";
import { expect, newContextWithIp, test } from "./fixtures";

/**
 * Subphase 10A (base): P7 — admin pages and APIs are 404 for everyone but
 * admins; P16 — admin actions write audit_logs. The admin is appointed with
 * the D21 script, as in production.
 */

const sameOrigin = { origin: "http://127.0.0.1:3000" };
const password = "orbit-lantern-42";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  await page.goto(authLink(await waitForMail(page.request, email)));
  await expect(page).toHaveURL(/\/en$/);
}

const adminApis = [
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/audit"],
  ["GET", "/api/admin/companies"],
  ["GET", "/api/admin/taxonomy/suggestions"],
  ["GET", "/api/admin/queue"],
  ["GET", "/api/admin/jobs"],
  ["GET", "/api/admin/import/sources"],
  ["GET", "/api/admin/import/runs"],
  ["POST", "/api/admin/queue/00000000-0000-4000-8000-000000000000/decide"],
  ["POST", "/api/admin/jobs/00000000-0000-4000-8000-000000000000/remove"],
  ["POST", "/api/admin/users/00000000-0000-4000-8000-000000000000/suspend"],
] as const;

test("P7: guests and regular users get 404 on admin pages and APIs", async ({
  page,
}) => {
  for (const path of [
    "/en/admin",
    "/en/admin/users",
    "/en/admin/audit",
    "/en/admin/moderation",
    "/en/admin/jobs",
    "/en/admin/import",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
  for (const [method, path] of adminApis) {
    const response = await page.request.fetch(path, {
      method,
      headers: sameOrigin,
      data: method === "POST" ? {} : undefined,
    });
    expect(response.status(), `${method} ${path}`).toBe(404);
  }

  await signUp(page, uniqueEmail("not-admin"));
  const response = await page.goto("/en/admin");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
  for (const [method, path] of adminApis) {
    const api = await page.request.fetch(path, {
      method,
      headers: sameOrigin,
      data: method === "POST" ? {} : undefined,
    });
    expect(api.status(), `${method} ${path}`).toBe(404);
  }
});

test("P16: an admin suspends a user, the user loses access, the audit log shows it", async ({
  page,
  browser,
}) => {
  const adminEmail = uniqueEmail("admin");
  await signUp(page, adminEmail);
  execFileSync(process.execPath, ["scripts/grant-admin.mjs", adminEmail], {
    stdio: "pipe",
    env: process.env,
  });

  const victimContext = await newContextWithIp(browser);
  const victim = await victimContext.newPage();
  await signUp(victim, uniqueEmail("suspended"));
  const victimId = (
    (await (await victim.request.get("/api/me")).json()) as {
      id: string;
    }
  ).id;

  await page.goto("/en/admin/users");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Users");

  const suspended = await page.request.post(
    `/api/admin/users/${victimId}/suspend`,
    { headers: sameOrigin, data: { note: "e2e" } },
  );
  expect(suspended.status()).toBe(200);
  expect((await suspended.json()).user).toMatchObject({
    id: victimId,
    status: "suspended",
  });

  expect((await victim.request.get("/api/me")).status()).toBe(401);

  const audit = await page.request.get(
    "/api/admin/audit?action=admin.user_suspended",
  );
  const entries = (await audit.json()).items as {
    entityId: string;
    actorId: string;
    action: string;
  }[];
  const entry = entries.find((item) => item.entityId === victimId);
  expect(entry).toBeTruthy();
  expect(JSON.stringify(entries)).not.toContain("ipHash");

  const again = await page.request.post(
    `/api/admin/users/${victimId}/suspend`,
    { headers: sameOrigin, data: {} },
  );
  expect(again.status()).toBe(409);

  const restored = await page.request.post(
    `/api/admin/users/${victimId}/unsuspend`,
    { headers: sameOrigin, data: {} },
  );
  expect(restored.status()).toBe(200);
  expect((await victim.request.get("/api/me")).status()).toBe(200);
  await victimContext.close();
});
