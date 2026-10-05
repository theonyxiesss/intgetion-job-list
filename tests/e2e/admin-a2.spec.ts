import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import type { Page } from "@playwright/test";
import { authLink, waitForMail } from "./mail";
import { expect, newContextWithIp, test } from "./fixtures";

const password = "orbit-lantern-42";
const adminHost = "http://admin.localhost:3000";
const reason = "support ticket";

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
  await expect(page).toHaveURL(/\/en$/);
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

async function userId(page: Page) {
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  return ((await me.json()) as { id: string }).id;
}

function adminApi(page: Page) {
  return {
    post(path: string, data: unknown) {
      return page.request.post(`${adminHost}${path}`, {
        data,
        headers: { origin: adminHost },
      });
    },
    get(path: string) {
      return page.request.get(`${adminHost}${path}`);
    },
  };
}

test("A2: actions, audit, denial, and four eyes", async ({ browser, page }) => {
  test.setTimeout(240_000);
  const victimContext = await newContextWithIp(browser);
  const victimPage = await victimContext.newPage();
  const victimEmail = uniqueEmail("victim");
  await signUp(victimPage, victimEmail);
  const victim = await userId(victimPage);

  const otherContext = await newContextWithIp(browser);
  const otherPage = await otherContext.newPage();
  const otherEmail = uniqueEmail("other");
  await signUp(otherPage, otherEmail);
  const other = await userId(otherPage);

  const ownerA = uniqueEmail("owner-a");
  const ownerB = uniqueEmail("owner-b");
  const support = uniqueEmail("support");
  const analyst = uniqueEmail("analyst");
  await signUp(page, ownerA);
  grant(ownerA, "owner");
  await signUp(page, ownerB);
  grant(ownerB, "owner");
  await signUp(page, support);
  grant(support, "support");
  await signUp(page, analyst);
  grant(analyst, "analyst");

  await signInAdmin(page, ownerA);
  const api = adminApi(page);

  const reveal = await api.post(`/api/admin/users/${victim}/reveal`, {
    reason,
  });
  expect(reveal.status(), await reveal.text()).toBe(200);
  expect(((await reveal.json()) as { email: string }).email).toBe(victimEmail);

  const card = await page.goto(`${adminHost}/ru/admin/users/${victim}`);
  expect(card?.status()).toBe(200);
  await expect(page.getByText(victimEmail, { exact: true })).toHaveCount(0);
  await expect(page.getByText("v***@example.com")).toBeVisible();

  const note = await api.post(`/api/admin/users/${victim}/notes`, {
    body: "called back",
  });
  expect(note.status(), await note.text()).toBe(200);
  const signout = await api.post(`/api/admin/users/${victim}/signout`, {
    reason,
  });
  expect(signout.status(), await signout.text()).toBe(200);
  const reset = await api.post(`/api/admin/users/${victim}/reset-password`, {
    reason,
  });
  expect(reset.status(), await reset.text()).toBe(200);
  const suspend = await api.post(`/api/admin/users/${victim}/suspend`, {
    note: reason,
  });
  expect(suspend.status(), await suspend.text()).toBe(200);

  const ban = await api.post(`/api/admin/users/${victim}/ban`, { reason });
  expect(ban.status(), await ban.text()).toBe(200);
  const banId = ((await ban.json()) as { approval: { id: string } }).approval
    .id;
  const selfBan = await api.post(`/api/admin/approvals/${banId}`, {
    decision: "approved",
  });
  expect(selfBan.status()).toBe(422);
  expect(
    ((await selfBan.json()) as { error: { code: string } }).error.code,
  ).toBe("FOUR_EYES");

  const deletion = await api.post(`/api/admin/users/${other}/delete`, {
    reason,
  });
  expect(deletion.status(), await deletion.text()).toBe(200);
  const deleteId = ((await deletion.json()) as { approval: { id: string } })
    .approval.id;
  const selfDelete = await api.post(`/api/admin/approvals/${deleteId}`, {
    decision: "approved",
  });
  expect(selfDelete.status()).toBe(422);

  await signInAdmin(page, support);
  const supportCard = await page.goto(`${adminHost}/ru/admin/users/${victim}`);
  expect(supportCard?.status()).toBe(200);
  await expect(page.getByRole("button", { name: "Забанить" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Удалить" })).toHaveCount(0);
  const supportBan = await adminApi(page).post(
    `/api/admin/users/${victim}/ban`,
    {
      reason,
    },
  );
  expect(supportBan.status()).toBe(404);

  await signInAdmin(page, ownerB);
  const approved = await adminApi(page).post(`/api/admin/approvals/${banId}`, {
    decision: "approved",
  });
  expect(approved.status(), await approved.text()).toBe(200);
  const deleted = await adminApi(page).post(
    `/api/admin/approvals/${deleteId}`,
    {
      decision: "approved",
    },
  );
  expect(deleted.status(), await deleted.text()).toBe(200);

  await victimPage.goto("/en/login");
  await victimPage.getByLabel("Email", { exact: true }).fill(victimEmail);
  await victimPage.locator('input[type="password"]').fill(password);
  await victimPage.getByRole("button", { name: "Sign in" }).click();
  await expect(victimPage.getByText("Wrong email or password.")).toBeVisible();
  expect(victimPage.url()).toContain("/login");

  for (const action of [
    "pii.read",
    "users.note",
    "users.signout",
    "users.reset_password",
    "users.suspend",
    "users.ban.requested",
    "users.ban",
    "users.delete.requested",
    "users.delete",
  ]) {
    const audit = await adminApi(page).get(
      `/api/admin/audit?action=${encodeURIComponent(action)}&limit=20`,
    );
    expect(audit.status(), action).toBe(200);
    const items = (
      (await audit.json()) as {
        items: { action: string; entityId: string | null }[];
      }
    ).items;
    expect(
      items.some((item) => item.action === action),
      action,
    ).toBe(true);
  }

  const companies = await page.goto(`${adminHost}/ru/admin/companies`);
  expect(companies?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Компании");

  await signInAdmin(page, analyst);
  const nav = page.getByRole("navigation", { name: "Администрирование" });
  await expect(nav.getByRole("link", { name: "Пользователи" })).toHaveCount(0);
  const denied = await page.goto(`${adminHost}/ru/admin/users`);
  expect(denied?.status()).toBe(404);
  const analystBan = await adminApi(page).post(
    `/api/admin/users/${victim}/ban`,
    {
      reason,
    },
  );
  expect(analystBan.status()).toBe(404);

  await victimContext.close();
  await otherContext.close();
});
