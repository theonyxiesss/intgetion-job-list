import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page } from "@playwright/test";
import { expect, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

/**
 * Subphase 5C. P4: contacts after express-interest, only for the company.
 * P14: rejected and withdrawn close them again. P16: each read is audited.
 * P3: the application and the profile still have no contacts key.
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

async function insertJobs(employerId: string) {
  const companyId = randomUUID();
  const firstJobId = randomUUID();
  const secondJobId = randomUUID();
  await withPg(async (query) => {
    await query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, $2, $3, 'verified', $4)`,
      [
        companyId,
        "Reveal E2E Co",
        `reveal-e2e-${companyId.slice(0, 8)}`,
        employerId,
      ],
    );
    await query(
      `insert into public.company_members (company_id, user_id, role)
       values ($1, $2, 'owner')`,
      [companyId, employerId],
    );
    for (const [jobId, title] of [
      [firstJobId, "Reveal e2e role"],
      [secondJobId, "Reveal e2e second role"],
    ] as const) {
      await query(
        `insert into public.jobs (
           id, company_id, created_by, title, description, category,
           employment_type, application_method, source, status, published_at
         ) values ($1, $2, $3, $4, $5, 'engineering', 'full_time', 'internal',
           'internal', 'published', now())`,
        [jobId, companyId, employerId, title, description],
      );
    }
  });
  return { firstJobId, secondJobId };
}

async function revealCount(applicationId: string) {
  return withPg(async (query) => {
    const result = await query(
      `select count(*)::int as n from public.application_reveals where application_id = $1`,
      [applicationId],
    );
    return Number(result.rows[0]?.n ?? 0);
  });
}

async function readCount(applicationId: string) {
  return withPg(async (query) => {
    const result = await query(
      `select count(*)::int as n from public.audit_logs
       where action = 'contacts.read' and entity_id = $1`,
      [applicationId],
    );
    return Number(result.rows[0]?.n ?? 0);
  });
}

test("express interest opens contacts, and a later decision closes them", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const candidateEmail = uniqueEmail("reveal-candidate");
  const contactEmail = uniqueEmail("reveal-contact");
  await registerWithPassword(page, candidateEmail);
  await confirmEmail(page, candidateEmail);
  await fillProfile(page, contactEmail);
  const candidateMe = await page.request.get("/api/me");
  const candidateId = ((await candidateMe.json()) as { id: string }).id;

  const employerContext = await newContextWithIp(browser);
  const employer = await employerContext.newPage();
  const employerEmail = uniqueEmail("reveal-employer");
  await registerWithPassword(employer, employerEmail);
  await confirmEmail(employer, employerEmail);
  const employerMe = await employer.request.get("/api/me");
  const employerId = ((await employerMe.json()) as { id: string }).id;
  const { firstJobId, secondJobId } = await insertJobs(employerId);

  const applied = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId: firstJobId, coverNote: "I would like to join." },
  });
  expect(applied.status()).toBe(201);
  const applicationId = (
    (await applied.json()) as { application: { id: string } }
  ).application.id;

  const own = await employer.request.get(`/api/applications/${applicationId}`);
  expect(own.status()).toBe(200);
  const ownBody = await own.json();
  expect(ownBody).not.toHaveProperty("contacts");
  expect(JSON.stringify(ownBody)).not.toContain(contactEmail);
  const profile = await employer.request.get(`/api/candidates/${candidateId}`);
  expect(profile.status()).toBe(200);
  expect(await profile.json()).not.toHaveProperty("contacts");

  const hidden = await employer.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(hidden.status()).toBe(404);

  const guestContext = await newContextWithIp(browser);
  const guest = await guestContext.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(guest.status()).toBe(404);
  await guestContext.close();

  const otherContext = await newContextWithIp(browser);
  const other = await otherContext.newPage();
  const otherEmail = uniqueEmail("reveal-other");
  await registerWithPassword(other, otherEmail);
  await confirmEmail(other, otherEmail);
  const foreign = await other.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(foreign.status()).toBe(404);

  const interest = await employer.request.post(
    `/api/applications/${applicationId}/express-interest`,
    { headers: sameOrigin },
  );
  expect(interest.status()).toBe(200);
  const interestBody = await interest.json();
  expect(interestBody).toMatchObject({ status: "shortlisted" });
  expect(interestBody).not.toHaveProperty("contacts");

  const opened = await employer.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(opened.status()).toBe(200);
  expect(await opened.json()).toMatchObject({ email: contactEmail });
  const openedAgain = await employer.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(openedAgain.status()).toBe(200);
  expect(await readCount(applicationId)).toBe(2);
  const stillProfile = await employer.request.get(
    `/api/candidates/${candidateId}`,
  );
  expect(await stillProfile.json()).not.toHaveProperty("contacts");
  const stillForeign = await other.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(stillForeign.status()).toBe(404);

  const rejected = await employer.request.patch(
    `/api/applications/${applicationId}/status`,
    { headers: sameOrigin, data: { to: "rejected" } },
  );
  expect(rejected.status()).toBe(200);
  const closed = await employer.request.get(
    `/api/applications/${applicationId}/contacts`,
  );
  expect(closed.status()).toBe(404);
  expect(await revealCount(applicationId)).toBe(1);

  const second = await page.request.post("/api/applications", {
    headers: sameOrigin,
    data: { jobId: secondJobId },
  });
  expect(second.status()).toBe(201);
  const secondId = ((await second.json()) as { application: { id: string } })
    .application.id;
  await employer.goto(`/en/employer/applications/${secondId}`);
  await employer.getByRole("button", { name: "Express interest" }).click();
  await expect(employer.getByText(contactEmail)).toBeVisible();
  const withdrawn = await page.request.post(
    `/api/applications/${secondId}/withdraw`,
    { headers: sameOrigin },
  );
  expect(withdrawn.status()).toBe(200);
  const afterWithdraw = await employer.request.get(
    `/api/applications/${secondId}/contacts`,
  );
  expect(afterWithdraw.status()).toBe(404);
  expect(await revealCount(secondId)).toBe(1);

  await otherContext.close();
  await employerContext.close();
});
