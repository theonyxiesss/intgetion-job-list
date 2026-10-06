import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { authLink, countMails, waitForMail } from "./mail";

/**
 * Subphase 1A: registration and sign-in by password and by magic link,
 * password reset, and "no writes before the email is confirmed".
 * Runs against `supabase start` with its mail catcher (scripts/ci-db.sh).
 */

const password = "orbit-lantern-42";
// Mutating API calls need the site Origin (CSRF check, 1B).
const sameOrigin = { origin: "http://127.0.0.1:3000" };

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

async function registerWithPassword(page: Page, email: string, pw = password) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
}

async function openLatestLink(page: Page, email: string, seen: number) {
  const mail = await waitForMail(page.request, email, seen);
  await page.goto(authLink(mail));
}

async function expectSignedIn(page: Page) {
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  return (await me.json()) as Record<string, unknown>;
}

async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByRole("navigation", { name: "Account" }).getByRole("link", {
      name: "Sign in",
    }),
  ).toBeVisible();
  expect((await page.request.get("/api/me")).status()).toBe(401);
}

// Next.js renders an empty route announcer with role=alert next to ours.
async function expectFormAlert(page: Page, text: string) {
  await expect(page.getByRole("alert").filter({ hasText: text })).toBeVisible();
}

async function signInWithPassword(page: Page, email: string, pw: string) {
  await page.goto("/en/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(pw);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("password: unconfirmed email cannot sign in or write; confirmed can", async ({
  page,
}) => {
  const email = uniqueEmail("pw");
  await registerWithPassword(page, email);

  await signInWithPassword(page, email, password);
  await expectFormAlert(page, "Confirm your email");
  const write = await page.request.patch("/api/me", {
    headers: sameOrigin,
    data: { locale: "ru" },
  });
  expect(write.status()).toBe(401);
  expect((await write.json()).error.code).toBe("UNAUTHENTICATED");

  await openLatestLink(page, email, 0);
  await expect(page).toHaveURL(/\/en$/);
  const me = await expectSignedIn(page);
  expect(me).toMatchObject({
    locale: "en",
    hasCandidateProfile: false,
    companies: [],
  });
  expect(me).not.toHaveProperty("auth_uid");
  expect(me).not.toHaveProperty("authUid");

  const patched = await page.request.patch("/api/me", {
    headers: sameOrigin,
    data: { locale: "ru", marketingOptIn: true },
  });
  expect(patched.status()).toBe(200);
  expect(await patched.json()).toMatchObject({
    locale: "ru",
    marketingOptIn: true,
  });

  await signOut(page);
  await signInWithPassword(page, email, password);
  await expect(page).toHaveURL(/\/en$/);
  await expectSignedIn(page);
});

test("magic link: register and sign in without a password", async ({
  page,
}) => {
  const email = uniqueEmail("magic");
  await page.goto("/en/register");
  await page.getByLabel("Email link").check();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);

  await openLatestLink(page, email, 0);
  await expect(page).toHaveURL(/\/en$/);
  await expectSignedIn(page);
  await signOut(page);

  const seen = await countMails(page.request, email);
  await page.goto("/en/login");
  await page.getByLabel("Email link").check();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send link" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);

  await openLatestLink(page, email, seen);
  await expect(page).toHaveURL(/\/en$/);
  await expectSignedIn(page);
});

test("password reset sets a new password through the emailed link", async ({
  page,
}) => {
  const email = uniqueEmail("reset");
  await registerWithPassword(page, email);
  await openLatestLink(page, email, 0);
  await expectSignedIn(page);
  await signOut(page);

  const seen = await countMails(page.request, email);
  await page.goto("/en/reset-password");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);

  await openLatestLink(page, email, seen);
  await expect(page).toHaveURL(/\/en\/reset-password\?mode=update$/);
  const newPassword = "harbor-violet-73"; // gitleaks:allow (test fixture)
  await page.getByLabel("New password").fill(newPassword);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/en$/);
  await expectSignedIn(page);
  await signOut(page);

  await signInWithPassword(page, email, password);
  await expectFormAlert(page, "Wrong email or password");
  await signInWithPassword(page, email, newPassword);
  await expect(page).toHaveURL(/\/en$/);
  await expectSignedIn(page);
});

test("reset request answers the same for an unknown address", async ({
  request,
}) => {
  const response = await request.post("/api/auth/reset", {
    headers: sameOrigin,
    data: { email: uniqueEmail("nobody"), locale: "en" },
  });
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
});

test("registration rejects short and common passwords and missing terms", async ({
  page,
  request,
}) => {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(uniqueEmail("weak"));
  await page.locator('input[type="password"]').fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByText("The password must be at least 10 characters."),
  ).toBeVisible();
  await expect(page.getByText("Accept the terms to continue.")).toBeVisible();
  await expect(page).toHaveURL(/\/en\/register$/);

  const common = await request.post("/api/auth/register", {
    headers: sameOrigin,
    data: {
      email: uniqueEmail("common"),
      password: "basketball",
      locale: "en",
      acceptTerms: true,
    },
  });
  expect(common.status()).toBe(400);
  expect(await common.json()).toMatchObject({
    error: {
      code: "VALIDATION_ERROR",
      details: [{ path: ["password"], message: "password_too_common" }],
    },
  });
});

// D314: the session must outlive the window, the tab and an API call.
test("the sign-in session is kept across reloads, tabs and a restart", async ({
  page,
  context,
}) => {
  const email = uniqueEmail("session");
  await registerWithPassword(page, email);
  await openLatestLink(page, email, 0);
  await expectSignedIn(page);

  // Not a window-lifetime cookie: it has an expiry far enough to survive a
  // browser restart, which is what "stay signed in" means to a person.
  const auth = (await context.cookies()).filter((cookie) =>
    cookie.name.startsWith("sb-"),
  );
  expect(auth.length).toBeGreaterThan(0);
  const weeks = Date.now() / 1000 + 14 * 24 * 60 * 60;
  for (const cookie of auth) {
    expect(cookie.expires, cookie.name).toBeGreaterThan(weeks);
    expect(cookie.httpOnly, cookie.name).toBe(true);
    expect(cookie.sameSite, cookie.name).toBe("Lax");
  }

  // A reload, a different page and a second tab all keep it.
  await page.reload();
  await expectSignedIn(page);
  await page.goto("/en/jobs");
  await expectSignedIn(page);
  const second = await context.newPage();
  await second.goto("/en");
  await expectSignedIn(second);
  await second.close();

  // A brand new context with the same cookies: the browser was restarted.
  const restarted = await context.browser()?.newContext({
    storageState: await context.storageState(),
    baseURL: "http://127.0.0.1:3000",
  });
  if (!restarted) throw new Error("no browser for the restart check");
  const after = await restarted.newPage();
  await after.goto("/en");
  await expectSignedIn(after);
  await restarted.close();
});

// D314: a guest's conversation belongs to the browser, not to the page view.
test("the agent remembers a guest across a reload", async ({ page }) => {
  await page.goto("/en/chat");
  await page.getByLabel("Write a message").fill("Rust jobs in Europe");
  await page.getByRole("button", { name: "Send" }).click();
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByText("Rust jobs in Europe")).toBeVisible();

  await page.reload();
  await expect(
    page
      .getByRole("log", { name: "Conversation" })
      .getByText("Rust jobs in Europe"),
  ).toBeVisible();
});

// D319: a taken address gets the same screen as a new one, and its owner is
// told by mail — so the form cannot be used to check who is registered.
test("registering twice writes to the owner instead of revealing the address", async ({
  page,
}) => {
  const email = uniqueEmail("taken");
  await registerWithPassword(page, email);
  await openLatestLink(page, email, 0);
  await expectSignedIn(page);
  await signOut(page);

  const seen = await countMails(page.request, email);
  await registerWithPassword(page, email, "orbit-lantern-77");
  // Same screen, no hint that the address is taken.
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  await expect(page.getByText(/already registered/i)).toHaveCount(0);

  const mail = await waitForMail(page.request, email, seen);
  expect(JSON.stringify(mail)).toContain("already have");
});
