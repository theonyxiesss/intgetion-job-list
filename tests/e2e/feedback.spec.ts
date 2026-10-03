import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page } from "@playwright/test";
import { expect, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 4B. Save → /saved-jobs, hide → gone from the viewer listing only,
 * one report per object (409), and P15: the 11th report in 24 hours is 429.
 * Published jobs are seeded straight into Postgres because an unverified
 * e2e company cannot publish through the API (D12).
 */

const sameOrigin = { origin: "http://127.0.0.1:3000" };
const password = "orbit-lantern-42";
const description =
  "Seeded job description for the 4B feedback e2e suite. Builds scalable web applications with a distributed remote team.";

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
  const mail = await waitForMail(page.request, email);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en$/);
}

async function seedPublishedJobs(count: number) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed 4B feedback jobs.");
  }
  const token = randomUUID().slice(0, 8);
  const companyId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.companies (id, name, slug, status)
       values ($1, $2, $3, 'verified')`,
      [
        companyId,
        `Feedback E2E Co ${token}`,
        `feedback-e2e-${companyId.slice(0, 8)}`,
      ],
    );
    const jobs: Array<{ id: string; title: string }> = [];
    for (let index = 1; index <= count; index += 1) {
      const id = randomUUID();
      const title = `Feedback e2e ${token} role ${index}`;
      await client.query(
        `insert into public.jobs (
           id, company_id, title, description, category, work_format,
           employment_type, application_method, status, published_at, expires_at
         ) values (
           $1, $2, $3, $4, 'engineering', 'remote', 'full_time', 'internal',
           'published', now(), now() + interval '30 days'
         )`,
        [id, companyId, title, description],
      );
      jobs.push({ id, title });
    }
    return { token, jobs };
  } finally {
    await client.end();
  }
}

test("a user saves a job and sees it under /saved-jobs", async ({ page }) => {
  await signUp(page, uniqueEmail("feedback-saver"));
  const {
    jobs: [job],
  } = await seedPublishedJobs(1);
  await page.goto(`/en/jobs/${job.id}`);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.goto("/en/saved-jobs");
  await expect(page.getByRole("link", { name: job.title })).toBeVisible();
  await page.getByRole("button", { name: "Remove from saved" }).click();
  await expect(page.getByText("You have no saved jobs yet.")).toBeVisible();
});

test("hiding a job removes it from the viewer listing but not from others", async ({
  page,
  browser,
}) => {
  await signUp(page, uniqueEmail("feedback-hider"));
  const { token, jobs } = await seedPublishedJobs(2);

  await page.goto(`/en/jobs?q=${token}`);
  await expect(page.getByRole("link", { name: jobs[0].title })).toBeVisible();

  const otherContext = await newContextWithIp(browser);
  const other = await otherContext.newPage();
  try {
    await page.goto(`/en/jobs/${jobs[0].id}`);
    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await page.getByRole("radio", { name: "Hide this job" }).check();
    // Wait for the hide request itself: leaving the page at once could
    // abort it before the server records the feedback.
    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes(`/api/jobs/${jobs[0].id}/hide`) &&
          response.ok(),
      ),
      page.getByRole("button", { name: "Confirm" }).click(),
    ]);
    await page.goto(`/en/jobs?q=${token}`);
    await expect(page.getByRole("link", { name: jobs[0].title })).toHaveCount(
      0,
    );
    await expect(page.getByRole("link", { name: jobs[1].title })).toBeVisible();
    // A different viewer still sees the hidden job in the shared listing.
    await other.goto(`/en/jobs?q=${token}`);
    await expect(
      other.getByRole("link", { name: jobs[0].title }),
    ).toBeVisible();
  } finally {
    await otherContext.close();
  }
});

test("a second report on the same job is rejected with 409", async ({
  page,
}) => {
  await signUp(page, uniqueEmail("feedback-reporter"));
  const {
    jobs: [job],
  } = await seedPublishedJobs(1);
  const first = await page.request.post(`/api/jobs/${job.id}/report`, {
    headers: sameOrigin,
    data: { reason: "scam", details: "looks fraudulent" },
  });
  expect(first.status()).toBe(201);
  const second = await page.request.post(`/api/jobs/${job.id}/report`, {
    headers: sameOrigin,
    data: { reason: "spam" },
  });
  expect(second.status()).toBe(409);
  expect(
    ((await second.json()) as { error: { code: string } }).error.code,
  ).toBe("ALREADY_REPORTED");
});

test("P15: the 11th report in 24 hours is limited with Retry-After", async ({
  page,
}) => {
  await signUp(page, uniqueEmail("feedback-limit"));
  const { jobs } = await seedPublishedJobs(11);
  for (const job of jobs.slice(0, 10)) {
    const reported = await page.request.post(`/api/jobs/${job.id}/report`, {
      headers: sameOrigin,
      data: { reason: "spam" },
    });
    expect(reported.status()).toBe(201);
  }
  const eleventh = await page.request.post(`/api/jobs/${jobs[10].id}/report`, {
    headers: sameOrigin,
    data: { reason: "spam" },
  });
  expect(eleventh.status()).toBe(429);
  expect(
    ((await eleventh.json()) as { error: { code: string } }).error.code,
  ).toBe("RATE_LIMITED");
  expect(eleventh.headers()["retry-after"]).toBeTruthy();
});

test("apply-external records feedback for a signed-in user only", async ({
  page,
}) => {
  const externalUrl = "https://example.com/jobs/4b-external";
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const companyId = randomUUID();
  const jobId = randomUUID();
  const sourceId = randomUUID();
  const token = randomUUID().slice(0, 8);
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.companies (id, name, slug, status)
       values ($1, $2, $3, 'verified')`,
      [
        companyId,
        `External E2E ${token}`,
        `external-e2e-${companyId.slice(0, 8)}`,
      ],
    );
    await client.query(
      `insert into public.import_sources (id, name, kind)
       values ($1, $2, 'api')`,
      [sourceId, `external-e2e-${token}`],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, title, description, category, work_format,
         employment_type, application_method, source, status, published_at, expires_at
       ) values (
         $1, $2, $3, $4, 'engineering', 'remote', 'full_time', 'external_url',
         'imported', 'published', now(), now() + interval '30 days'
       )`,
      [jobId, companyId, `External e2e ${token}`, description],
    );
    await client.query(
      `insert into public.job_sources (
         job_id, import_source_id, external_id, source_url, is_primary
       ) values ($1, $2, $3, $4, true)`,
      [jobId, sourceId, `ext-${token}`, externalUrl],
    );
  } finally {
    await client.end();
  }

  async function feedbackCount() {
    const countClient = new pg.Client({ connectionString });
    await countClient.connect();
    try {
      const result = await countClient.query(
        `select count(*)::int as n from public.user_job_feedback
         where job_id = $1 and action = 'applied_external'`,
        [jobId],
      );
      return Number(result.rows[0]?.n ?? 0);
    } finally {
      await countClient.end();
    }
  }

  const guest = await page.request.post(`/api/jobs/${jobId}/apply-external`, {
    headers: sameOrigin,
  });
  expect(guest.status()).toBe(200);
  expect(((await guest.json()) as { externalUrl: string }).externalUrl).toBe(
    externalUrl,
  );
  expect(await feedbackCount()).toBe(0);

  await signUp(page, uniqueEmail("feedback-external"));
  const signedIn = await page.request.post(
    `/api/jobs/${jobId}/apply-external`,
    { headers: sameOrigin },
  );
  expect(signedIn.ok()).toBeTruthy();
  expect(await feedbackCount()).toBe(1);
  const repeat = await page.request.post(`/api/jobs/${jobId}/apply-external`, {
    headers: sameOrigin,
  });
  expect(repeat.ok()).toBeTruthy();
  expect(await feedbackCount()).toBe(1);

  await page.goto(`/en/jobs/${jobId}`);
  const link = page.getByRole("link", { name: "Apply" });
  await expect(link).toHaveAttribute("href", externalUrl);
  await page.route("https://example.com/**", (route) =>
    route.fulfill({ status: 200, body: "external" }),
  );
  const posted = page.waitForResponse(
    (response) =>
      response.url().includes("/apply-external") &&
      response.request().method() === "POST",
  );
  await link.click();
  expect((await posted).ok()).toBeTruthy();
  expect(await feedbackCount()).toBe(1);
});
