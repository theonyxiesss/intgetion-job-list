import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 5A. P9: a second apply is 409, an imported job is 422 with
 * externalUrl, and the candidate can withdraw from /applications.
 */

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

async function insertJobs(userId: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed jobs for P9.");
  }
  const companyId = randomUUID();
  const publishedJobId = randomUUID();
  const importedJobId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [
        companyId,
        "Applications E2E Co",
        `apply-e2e-${companyId.slice(0, 8)}`,
        userId,
      ],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         employment_type, application_method, source, status, published_at
       ) values ($1, $2, $3, $4, $5, 'engineering', 'full_time', 'internal',
         'internal', 'published', now())`,
      [publishedJobId, companyId, userId, "Published e2e role", description],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         employment_type, application_method, application_url, source, status,
         published_at
       ) values (
         $1, $2, $3, $4, $5, 'engineering', 'full_time', 'external_url',
         'https://example.com/apply', 'imported', 'published', now()
       )`,
      [importedJobId, companyId, userId, "Imported e2e role", description],
    );
  } finally {
    await client.end();
  }
  return { publishedJobId, importedJobId };
}

test("candidate applies, a repeat is 409, imported is 422, and withdraw works", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const email = uniqueEmail("apply");
  await registerWithPassword(page, email);
  await confirmEmail(page, email);
  await fillProfile(page, `contacts-${email}`);

  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  const meBody = (await me.json()) as { id: string };
  const { publishedJobId, importedJobId } = await insertJobs(meBody.id);

  const first = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId: publishedJobId },
  });
  expect(first.status()).toBe(201);
  const firstBody = (await first.json()) as {
    application: { id: string; status: string };
  };
  expect(firstBody.application.status).toBe("applied");

  const repeat = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId: publishedJobId },
  });
  expect(repeat.status()).toBe(409);
  expect(await repeat.json()).toMatchObject({
    error: { code: "ALREADY_APPLIED" },
  });

  const imported = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId: importedJobId },
  });
  expect(imported.status()).toBe(422);
  const importedBody = await imported.json();
  expect(importedBody).toMatchObject({
    error: {
      code: "EXTERNAL_APPLY",
      details: { externalUrl: "https://example.com/apply" },
    },
  });

  await page.goto("/en/applications");
  await expect(
    page.getByRole("heading", { name: "Published e2e role" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
  await page.getByRole("link", { name: "Archive" }).click();
  await expect(page.getByText("Withdrawn", { exact: true })).toBeVisible();
});
