import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page } from "@playwright/test";
import { signUnsubscribe } from "../../src/modules/notifications/lib/unsubscribe";
import { expect, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

const password = "orbit-lantern-42";
const sameOrigin = { origin: "http://127.0.0.1:3000" };
const description =
  "Build and maintain reliable backend services with a collaborative remote team.";

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
  await expect(page).toHaveURL(/\/en\/auth\/(confirmed|signed-in)/);
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

async function fillProfile(page: Page, contactEmail: string) {
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
}

async function withPg<T>(run: (query: pg.Client["query"]) => Promise<T>) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await run(client.query.bind(client));
  } finally {
    await client.end();
  }
}

test("notifications feed, preferences, and unsubscribe", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  const candidateEmail = uniqueEmail("notify-candidate");
  await registerWithPassword(page, candidateEmail);
  await confirmEmail(page, candidateEmail);
  await fillProfile(page, candidateEmail);

  const employerContext = await newContextWithIp(browser);
  const employer = await employerContext.newPage();
  const employerEmail = uniqueEmail("notify-employer");
  await registerWithPassword(employer, employerEmail);
  await confirmEmail(employer, employerEmail);
  const employerMe = await employer.request.get("/api/me");
  const employerId = ((await employerMe.json()) as { id: string }).id;
  const jobId = randomUUID();
  const companyId = randomUUID();
  await withPg(async (query) => {
    await query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [
        companyId,
        "Notify E2E Co",
        `notify-e2e-${companyId.slice(0, 8)}`,
        employerId,
      ],
    );
    await query(
      `insert into public.company_members (company_id, user_id, role)
       values ($1, $2, 'owner')`,
      [companyId, employerId],
    );
    await query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         employment_type, application_method, source, status, published_at
       ) values ($1, $2, $3, $4, $5, 'engineering', 'full_time', 'internal',
         'internal', 'published', now())`,
      [jobId, companyId, employerId, "Notify e2e role", description],
    );
  });

  const applied = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId, coverNote: null },
  });
  expect(applied.ok()).toBeTruthy();

  // The bot switch waits for a linked Telegram.
  await page.goto("/en/notifications");
  await expect(
    page.getByRole("switch", { name: "New jobs in the Telegram bot" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("link", { name: "Link Telegram in account settings" }),
  ).toBeVisible();

  const feed = await employer.request.get("/api/notifications");
  expect(feed.ok()).toBeTruthy();
  const body = (await feed.json()) as {
    unreadCount: number;
    items: { id: string }[];
  };
  expect(body.unreadCount).toBeGreaterThan(0);
  await employer.goto("/en");
  await expect(
    employer.getByRole("link", { name: /Notifications/ }),
  ).toContainText(String(body.unreadCount));

  const foreign = await page.request.post("/api/notifications/read", {
    headers: sameOrigin,
    data: { ids: body.items.map((item) => item.id) },
  });
  expect(foreign.ok()).toBeTruthy();
  const untouched = await employer.request.get("/api/notifications");
  expect(
    ((await untouched.json()) as { unreadCount: number }).unreadCount,
  ).toBe(body.unreadCount);

  const marked = await employer.request.post("/api/notifications/read", {
    headers: sameOrigin,
    data: { all: true },
  });
  expect(marked.ok()).toBeTruthy();
  const after = await employer.request.get("/api/notifications");
  expect(((await after.json()) as { unreadCount: number }).unreadCount).toBe(0);

  const saved = await employer.request.put("/api/notifications/preferences", {
    headers: sameOrigin,
    data: {
      preferences: [
        { type: "application.created", channel: "email", enabled: false },
      ],
    },
  });
  expect(saved.ok()).toBeTruthy();
  const prefs = (await saved.json()) as {
    preferences: { type: string; channel: string; enabled: boolean }[];
  };
  expect(
    prefs.preferences.find(
      (item) => item.type === "application.created" && item.channel === "email",
    )?.enabled,
  ).toBe(false);

  const queued = await withPg(async (query) => {
    const result = await query(
      `select user_id, type from public.notification_emails
       where user_id = $1 and status = 'pending' limit 1`,
      [employerId],
    );
    return result.rows[0] as { user_id: string; type: string } | undefined;
  });
  expect(queued?.type).toBe("application.created");
  await employer.request.put("/api/notifications/preferences", {
    headers: sameOrigin,
    data: {
      preferences: [
        { type: "application.created", channel: "email", enabled: true },
      ],
    },
  });
  const token = signUnsubscribe(
    {
      userId: employerId,
      type: "application.created",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    process.env.UNSUBSCRIBE_SECRET ?? "",
  );
  const off = await page.request.post("/api/notifications/unsubscribe", {
    headers: sameOrigin,
    data: { token },
  });
  expect(off.ok()).toBeTruthy();
  const afterOff = await employer.request.get("/api/notifications/preferences");
  const offPrefs = (await afterOff.json()) as {
    preferences: { type: string; channel: string; enabled: boolean }[];
  };
  expect(
    offPrefs.preferences.find(
      (item) => item.type === "application.created" && item.channel === "email",
    )?.enabled,
  ).toBe(false);
  await employerContext.close();
});
