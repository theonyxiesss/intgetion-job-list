import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { authLink, waitForMail } from "./mail";
import { consentCookie, expect, test, testIp } from "./fixtures";

const password = "orbit-lantern-42";
const adminHost = "http://admin.localhost:3000";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

function grant(email: string, role = "owner") {
  execFileSync(process.execPath, ["scripts/grant-admin.mjs", email, role], {
    stdio: "pipe",
    env: process.env,
  });
}

async function signUp(page: Page, email: string) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  await page.goto(authLink(await waitForMail(page.request, email)));
  await expect(page).toHaveURL(/\/en\/auth\/confirmed$/);
}

function totp(secret: string, at = Date.now()) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = secret
    .replace(/=+$/g, "")
    .toUpperCase()
    .replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of cleaned) {
    buffer = (buffer << 5) | alphabet.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30000)));
  const hmac = createHmac("sha1", Buffer.from(bytes)).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return code.toString().padStart(6, "0");
}

async function signInAdmin(page: Page, email: string) {
  await page.goto(`${adminHost}/ru/admin/login`);
  await page.getByLabel("Почта").fill(email);
  await page.getByLabel("Пароль").fill(password);
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/ru\/admin\/mfa/);
  const secret = await page.getByTestId("totp-secret-value").innerText();
  await page.getByLabel("Код").fill(totp(secret));
  await page.getByRole("button", { name: "Подтвердить" }).click();
  await page.getByRole("link", { name: "Продолжить" }).click();
  await expect(page).toHaveURL(/\/ru\/admin$/);
}

const ownerSections = [
  "Обзор",
  "Модерация",
  "Жалобы",
  "Вакансии",
  "Пользователи",
  "Импорт",
  "Предложенные навыки",
  "Журнал аудита",
  "Метрики",
  "Команда",
  "Флаги",
];

test("owner signs in with TOTP and sees every section", async ({ page }) => {
  const email = uniqueEmail("owner");
  await signUp(page, email);
  grant(email, "owner");
  const main = await page.goto("/en/admin");
  expect(main?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Overview");

  await signInAdmin(page, email);
  const nav = page.getByRole("navigation", { name: "Администрирование" });
  for (const name of ownerSections) {
    await expect(nav.getByRole("link", { name, exact: true })).toBeVisible();
  }

  await page.setViewportSize({ width: 360, height: 800 });
  const scrolls = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(scrolls).toBe(false);
  await page.setViewportSize({ width: 1280, height: 800 });
  const critical = (await new AxeBuilder({ page }).analyze()).violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});

test("a moderator does not see Team or Flags", async ({ page }) => {
  const email = uniqueEmail("mod");
  await signUp(page, email);
  grant(email, "moderator");
  await signInAdmin(page, email);
  const nav = page.getByRole("navigation", { name: "Администрирование" });
  await expect(nav.getByRole("link", { name: "Команда" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Флаги" })).toHaveCount(0);
  const team = await page.goto(`${adminHost}/ru/admin/team`);
  expect(team?.status()).toBe(404);
});

test("someone who is not an admin gets 404 on the admin host", async ({
  page,
}) => {
  for (const path of ["/ru/admin", "/ru/admin/users", "/ru/jobs"]) {
    const response = await page.goto(`${adminHost}${path}`);
    expect(response?.status(), path).toBe(404);
  }
});

test("ADMIN_HOST_ONLY hides /admin on the main host", async ({ browser }) => {
  test.skip(!process.env.CI, "the flagged server is started in CI");
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3100",
    extraHTTPHeaders: { "x-forwarded-for": testIp() },
  });
  await context.addCookies([
    { ...consentCookie, url: "http://127.0.0.1:3100" },
  ]);
  const page = await context.newPage();
  const email = uniqueEmail("flag");
  await signUp(page, email);
  grant(email, "owner");
  const response = await page.goto("/en/admin");
  expect(response?.status()).toBe(404);
  await context.close();
});
