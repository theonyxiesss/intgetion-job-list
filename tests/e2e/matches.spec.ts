import { randomUUID } from "node:crypto";
import pg from "pg";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

const password = "orbit-lantern-42";
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

async function fillProfile(page: Page, contactEmail: string, title: string) {
  await page.goto("/en/profile/edit");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Headline").fill("Engineer");
  await page.getByLabel("Desired titles").fill(title);
  await page.getByRole("textbox", { name: /^Timezone/ }).fill("Europe/Berlin");
  await page.getByLabel("I confirm this timezone").check();
  await page.getByLabel("Years of experience").fill("5");
  await page
    .getByRole("textbox", { name: /^Skills/ })
    .fill("React, TypeScript, Python");
  await page.getByLabel("Remote").check();
  await page.getByLabel("Full time").check();
  await page.getByLabel("Language code").fill("en");
  await page.getByLabel("Minimum salary, minor units").fill("100000");
  await page.getByLabel("Salary currency").fill("EUR");
  await page.getByLabel("Contact email").fill(contactEmail);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);
}

async function insertMatchJob(userId: string, title: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const companyId = randomUUID();
  const jobId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const skill = await client.query<{ id: string }>(
      `select id from public.skills where slug = 'react' limit 1`,
    );
    const skillId = skill.rows[0]?.id;
    if (!skillId) throw new Error("react skill is missing");
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [
        companyId,
        "Matches E2E Co",
        `match-e2e-${companyId.slice(0, 8)}`,
        userId,
      ],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         work_format, employment_type, application_method, source, status,
         published_at, expires_at, salary_min, salary_max, salary_currency,
         salary_period, salary_basis, experience_min
       ) values (
         $1, $2, $3, $4, $5, 'engineering', 'remote', 'full_time', 'internal',
         'internal', 'published', now(), now() + interval '30 days',
         500000, 700000, 'EUR', 'month', 'gross', 1
       )`,
      [jobId, companyId, userId, title, description],
    );
    await client.query(
      `insert into public.job_skills (job_id, skill_id, weight, min_level)
       values ($1, $2, 2, 'novice')`,
      [jobId, skillId],
    );
  } finally {
    await client.end();
  }
  return jobId;
}

test("a guest opening matches is sent to login", async ({ page }) => {
  await page.goto("/en/matches");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("a candidate sees matches, explain, dismiss, and the job reason", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  const email = uniqueEmail("matches");
  const title = `Backend engineer ${randomUUID().slice(0, 8)}`;
  await registerWithPassword(page, email);
  await confirmEmail(page, email);
  await fillProfile(page, `contacts-${email}`, title);
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  const meBody = (await me.json()) as { id: string };
  const jobId = await insertMatchJob(meBody.id, title);
  const card = page.locator("div.flex.flex-col.gap-3").filter({
    has: page.getByRole("link", { name: title, exact: true }),
  });

  await page.goto("/en/matches");
  await expect(page.getByRole("heading", { name: "Matches" })).toBeVisible();
  await expect(
    card.getByRole("link", { name: title, exact: true }),
  ).toBeVisible();
  await expect(card.getByText("Has the required skills.")).toBeVisible();

  await page.goto(`/en/jobs/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Why this fits" }),
  ).toBeVisible();

  const guest = await newContextWithIp(browser);
  const guestPage = await guest.newPage();
  await guestPage.goto(`/en/jobs/${jobId}`);
  await expect(guestPage.locator("h1")).toBeVisible();
  await expect(
    guestPage.getByRole("heading", { name: "Why this fits" }),
  ).toHaveCount(0);
  await guest.close();

  await page.goto("/en/matches");
  await card.getByRole("button", { name: "Not a fit" }).click();
  await page.getByRole("button", { name: "Hide this job" }).click();
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toHaveCount(0);
  await page.goto("/en/matches?tab=hidden");
  await expect(
    page.getByRole("link", { name: title, exact: true }),
  ).toBeVisible();

  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en/matches");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth <=
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(true);
  const violations = (
    await new AxeBuilder({ page }).analyze()
  ).violations.filter(
    (issue) => issue.impact === "critical" || issue.impact === "serious",
  );
  expect(violations).toEqual([]);
});
