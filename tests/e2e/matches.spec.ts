import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 6B: /matches with explain, "Not a fit" moves a job to Hidden,
 * "Why it fits" on the job page for a candidate and not for a guest.
 */

const password = "orbit-lantern-42";
const description =
  "Build and maintain reliable backend services with a collaborative remote team.";

function uniqueEmail(prefix: string) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${suffix}@example.com`;
}

async function signUpCandidate(page: Page) {
  const email = uniqueEmail("matches");
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en$/);

  await page.goto("/en/profile/edit");
  await page.getByLabel("Full name").fill("Grace Hopper");
  await page.getByLabel("Headline").fill("Engineer");
  await page.getByLabel("Desired titles").fill("Backend engineer");
  await page.getByRole("textbox", { name: /^Timezone/ }).fill("Europe/Berlin");
  await page.getByLabel("I confirm this timezone").check();
  await page.getByLabel("Years of experience").fill("5");
  await page.getByRole("textbox", { name: /^Skills/ }).fill("React, Python");
  await page.getByLabel("Language code").fill("en");
  await page.getByLabel("Minimum salary, minor units").fill("100000");
  await page.getByLabel("Salary currency").fill("EUR");
  await page.getByLabel("Contact email").fill(`contacts-${email}`);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);

  const me = await page.request.get("/api/me");
  return ((await me.json()) as { id: string }).id;
}

async function insertMatchingJob(userId: string, title: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required for 6B.");
  const companyId = randomUUID();
  const jobId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [companyId, `Matches ${title}`, `match-${companyId.slice(0, 8)}`, userId],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         work_format, employment_type, application_method, source, status,
         published_at, expires_at
       ) values ($1, $2, $3, $4, $5, 'engineering', 'remote', 'full_time',
         'internal', 'internal', 'published', now(), now() + interval '30 days')`,
      [jobId, companyId, userId, title, description],
    );
    await client.query(
      `insert into public.job_skills (job_id, skill_id, weight)
       select $1, id, 3 from public.skills where slug = 'react'`,
      [jobId],
    );
  } finally {
    await client.end();
  }
  return jobId;
}

test("a guest on /matches is sent to sign in", async ({ page }) => {
  await page.goto("/en/matches");
  await expect(page).toHaveURL(/\/en\/login/);
});

test("candidate sees matches with explain, dismisses one, and sees why it fits", async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000);
  const userId = await signUpCandidate(page);
  const title = `Backend engineer ${randomUUID().slice(0, 6)}`;
  const jobId = await insertMatchingJob(userId, title);

  await page.goto("/en");
  await page.getByRole("link", { name: "Matches" }).first().click();
  await expect(page).toHaveURL(/\/en\/matches$/);
  const card = page.getByRole("listitem").filter({ hasText: title });
  await expect(card.getByRole("heading", { name: title })).toBeVisible();
  await expect(card.getByText(/% match$/)).toBeVisible();
  await expect(card.getByText("Has the required skills.")).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);

  // Why it fits on the job page, for the candidate only.
  await page.goto(`/en/jobs/${jobId}`);
  await expect(
    page.getByRole("heading", { name: "Why it fits" }),
  ).toBeVisible();
  const guest = await browser.newContext();
  const guestPage = await guest.newPage();
  await guestPage.goto(`/en/jobs/${jobId}`);
  await expect(guestPage.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(
    guestPage.getByRole("heading", { name: "Why it fits" }),
  ).toHaveCount(0);
  await guest.close();

  // 360 px: no horizontal scroll.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en/matches");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  await page.setViewportSize({ width: 1280, height: 800 });

  // Not a fit → gone from All, listed under Hidden.
  await page.getByRole("button", { name: `Not a fit: ${title}` }).click();
  const dialog = page.getByRole("dialog", { name: "Why doesn't it fit?" });
  await dialog.getByLabel("Salary").check();
  await dialog.getByRole("button", { name: "Hide job" }).click();
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
  await page.getByRole("link", { name: /^Hidden/ }).click();
  await expect(page).toHaveURL(/tab=hidden/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
