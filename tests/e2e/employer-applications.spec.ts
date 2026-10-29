import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page } from "@playwright/test";
import { expect, expectSignedInMenu, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 5B. Opening an application marks it viewed. P3: the employer
 * profile has no contacts key. P5: viewed does not reveal contacts, and
 * shortlisted is 422. Interview, offer and hired follow the 4.2 edges
 * after the test places the row in shortlisted (that write is 5C).
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
  await expect(page).toHaveURL(/:\d+\/auth\/check-email$/);
}

async function confirmEmail(page: Page, email: string) {
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/:\d+\/auth\/(confirmed|signed-in)/);
  await expectSignedInMenu(page);
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
  // D517: the form returns to the one account page.
  await expect(page).toHaveURL(/:\d+\/account$/);
}

async function insertJob(employerId: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed the employer job.");
  }
  const companyId = randomUUID();
  const jobId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [
        companyId,
        "Pipeline E2E Co",
        `pipe-e2e-${companyId.slice(0, 8)}`,
        employerId,
      ],
    );
    await client.query(
      `insert into public.company_members (company_id, user_id, role)
       values ($1, $2, 'owner')`,
      [companyId, employerId],
    );
    await client.query(
      `insert into public.jobs (
         id, company_id, created_by, title, description, category,
         employment_type, application_method, source, status, published_at
       ) values ($1, $2, $3, $4, $5, 'engineering', 'full_time', 'internal',
         'internal', 'published', now())`,
      [jobId, companyId, employerId, "Pipeline e2e role", description],
    );
  } finally {
    await client.end();
  }
  return jobId;
}

async function insertWithdrawnApplications(
  jobId: string,
  candidateId: string,
  count: number,
) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.applications (job_id, candidate_id, status)
       select $1, $2, 'withdrawn'::public.application_status
       from generate_series(1, $3::int)`,
      [jobId, candidateId, count],
    );
  } finally {
    await client.end();
  }
}

async function markShortlisted(applicationId: string) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `update public.applications set status = 'shortlisted' where id = $1`,
      [applicationId],
    );
  } finally {
    await client.end();
  }
}

test("employer views an application, then moves it to interview, offer and hired", async ({
  page,
  browser,
}) => {
  test.setTimeout(180_000);
  const candidateEmail = uniqueEmail("pipeline-candidate");
  const contactEmail = uniqueEmail("pipeline-contact");
  await registerWithPassword(page, candidateEmail);
  await confirmEmail(page, candidateEmail);
  await fillProfile(page, contactEmail);

  const employerContext = await newContextWithIp(browser);
  const employer = await employerContext.newPage();
  const employerEmail = uniqueEmail("pipeline-employer");
  await registerWithPassword(employer, employerEmail);
  await confirmEmail(employer, employerEmail);
  const employerMe = await employer.request.get("/api/me");
  expect(employerMe.status()).toBe(200);
  const employerId = ((await employerMe.json()) as { id: string }).id;
  const jobId = await insertJob(employerId);

  const applied = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId, coverNote: "I would like to join." },
  });
  expect(applied.status()).toBe(201);
  const applicationId = (
    (await applied.json()) as { application: { id: string } }
  ).application.id;
  const candidateMe = await page.request.get("/api/me");
  const candidateId = ((await candidateMe.json()) as { id: string }).id;

  await insertWithdrawnApplications(jobId, candidateId, 51);
  const filteredApiPage = await employer.request.get(
    `/api/applications?as=employer&jobId=${jobId}&status=withdrawn&limit=50`,
  );
  expect(filteredApiPage.status()).toBe(200);
  expect(await filteredApiPage.json()).toMatchObject({
    counts: { all: 52, applied: 1, withdrawn: 51 },
    items: expect.arrayContaining([
      expect.objectContaining({ status: "withdrawn" }),
    ]),
  });

  await employer.goto(
    `/en/employer/jobs/${jobId}/applications?status=withdrawn`,
  );
  await expect(
    employer.getByRole("link", { name: "Withdrawn 51" }),
  ).toHaveAttribute("aria-current", "page");
  await employer.getByRole("link", { name: "Next page" }).click();
  const nextPageUrl = new URL(employer.url());
  expect(nextPageUrl.searchParams.get("status")).toBe("withdrawn");
  expect(nextPageUrl.searchParams.get("cursor")).toBeTruthy();
  await expect(employer.getByRole("link", { name: "Next page" })).toHaveCount(
    0,
  );

  await employer.getByRole("link", { name: "Applied 1" }).click();
  await expect(employer).toHaveURL(/status=applied/);
  await employer.getByRole("link", { name: "Ada Lovelace" }).click();
  await expect(employer.getByText("Viewed", { exact: true })).toBeVisible();
  await expect(employer.getByText(contactEmail)).toHaveCount(0);

  const own = await page.request.get(`/api/applications/${applicationId}`);
  expect(own.status()).toBe(200);
  expect(await own.json()).toMatchObject({ status: "viewed" });

  const profile = await employer.request.get(`/api/candidates/${candidateId}`);
  expect(profile.status()).toBe(200);
  const profileBody = await profile.json();
  expect(profileBody).not.toHaveProperty("contacts");
  expect(JSON.stringify(profileBody)).not.toContain(contactEmail);

  const shortlisted = await employer.request.patch(
    `/api/applications/${applicationId}/status`,
    { headers: sameOrigin, data: { to: "shortlisted" } },
  );
  expect(shortlisted.status()).toBe(422);
  expect(await shortlisted.json()).toMatchObject({
    error: { code: "EXPRESS_INTEREST_REQUIRED" },
  });
  const stillHidden = await employer.request.get(
    `/api/candidates/${candidateId}`,
  );
  expect(await stillHidden.json()).not.toHaveProperty("contacts");

  await markShortlisted(applicationId);
  await employer.reload();
  await employer.getByRole("button", { name: "Interview" }).click();
  await expect(employer.getByRole("button", { name: "Offer" })).toBeVisible();
  await employer.getByRole("button", { name: "Offer" }).click();
  await expect(employer.getByRole("button", { name: "Hired" })).toBeVisible();
  await employer.getByRole("button", { name: "Hired" }).click();
  await expect(employer.getByText("Hired", { exact: true })).toBeVisible();
  await expect(employer.getByRole("button", { name: "Hired" })).toHaveCount(0);
  await employerContext.close();
});
