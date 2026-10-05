import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authLink, waitForMail } from "./mail";
import { expect, test } from "./fixtures";

const sameOrigin = { origin: "http://127.0.0.1:3000" };
const password = "orbit-lantern-42";

const adminPaths = [
  "/en/admin",
  "/en/admin/moderation",
  "/en/admin/reports",
  "/en/admin/jobs",
  "/en/admin/companies",
  "/en/admin/users",
  "/en/admin/import",
  "/en/admin/taxonomy",
  "/en/admin/audit",
  "/en/admin/metrics",
  "/en/admin/companies/00000000-0000-4000-8000-000000000000",
  "/en/admin/users/00000000-0000-4000-8000-000000000000",
];

const sections = [
  "Overview",
  "Moderation",
  "Reports",
  "Jobs",
  "Companies",
  "Users",
  "Import",
  "Skill suggestions",
  "Audit log",
  "Metrics",
];

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

async function expectNoCriticalAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter((violation) => violation.impact === "critical"),
  ).toEqual([]);
}

async function expectNoHorizontalScroll(page: Page, path: string) {
  const report = await page.evaluate(() => {
    const inner = window.innerWidth;
    const found: { cls: string; right: number; width: number }[] = [];
    document.querySelectorAll("body *").forEach((node) => {
      const el = node as HTMLElement;
      const rect = el.getBoundingClientRect();
      if (rect.right > inner + 1) {
        found.push({
          cls: String(el.className).slice(0, 90),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    found.sort((a, b) => b.right - a.right);
    return {
      scroll: document.documentElement.scrollWidth,
      inner,
      found: found.slice(0, 6),
    };
  });
  expect(
    report.scroll,
    `${path} ${JSON.stringify(report.found)}`,
  ).toBeLessThanOrEqual(report.inner);
}

test("non-admins get 404 on every admin page", async ({ page }) => {
  for (const path of adminPaths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
  await signUp(page, uniqueEmail("not-admin-panel"));
  for (const path of adminPaths) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
  }
});

test("an admin sees every section and opens a company and a user", async ({
  page,
}) => {
  const email = uniqueEmail("admin-panel");
  await signUp(page, email);
  execFileSync(process.execPath, ["scripts/grant-admin.mjs", email], {
    stdio: "pipe",
    env: process.env,
  });
  const companyName = `Panel Co ${Date.now()}`;
  const created = await page.request.post("/api/companies", {
    headers: sameOrigin,
    data: { name: companyName, domain: `panel-${Date.now()}.example.com` },
  });
  expect(created.status()).toBe(201);
  const { company } = (await created.json()) as { company: { id: string } };
  const me = (await (await page.request.get("/api/me")).json()) as {
    id: string;
  };

  await page.goto("/en/admin");
  const nav = page.getByRole("navigation", { name: "Administration" });
  for (const name of sections) {
    await expect(nav.getByRole("link", { name })).toBeVisible();
  }

  await nav.getByRole("link", { name: "Companies" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Companies");
  await page.getByRole("link", { name: companyName }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(companyName);

  await page.goto("/en/admin/users");
  await page.getByRole("link", { name: me.id }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("User");
  await expect(page.getByText(me.id)).toBeVisible();

  const pages = [
    "/en/admin",
    "/en/admin/moderation",
    "/en/admin/reports",
    "/en/admin/jobs",
    "/en/admin/companies",
    `/en/admin/companies/${company.id}`,
    "/en/admin/users",
    `/en/admin/users/${me.id}`,
    "/en/admin/import",
    "/en/admin/taxonomy",
    "/en/admin/audit",
    "/en/admin/metrics",
  ];
  for (const path of pages) {
    await page.goto(path);
    await expectNoCriticalAxe(page);
  }

  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of pages) {
    await page.goto(path);
    await expectNoHorizontalScroll(page, path);
  }
});
