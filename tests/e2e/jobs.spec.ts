import { expect, newContextWithIp, test } from "./fixtures";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { authLink, waitForMail } from "./mail";

const sameOrigin = { origin: "http://127.0.0.1:3000" };
const password = "orbit-lantern-42";

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

test("P2: employer creates and publishes a job; a different employer gets 404", async ({
  page,
  browser,
}) => {
  await signUp(page, uniqueEmail("job-owner"));
  const companyResponse = await page.request.post("/api/companies", {
    headers: sameOrigin,
    data: {
      name: `Job Test Company ${Date.now()}`,
      domain: `job-${Date.now()}.example.com`,
      description: "A company for job API tests",
    },
  });
  expect(companyResponse.status()).toBe(201);
  const { company } = await companyResponse.json();
  const createResponse = await page.request.post("/api/jobs", {
    headers: sameOrigin,
    data: {
      companyId: company.id,
      title: "Remote Backend Engineer",
      description:
        "Build reliable API services and work closely with a distributed engineering team.",
      category: "engineering",
      employmentType: "full_time",
      workFormat: "remote",
      applicationMethod: "internal",
      skills: [],
      languages: [],
    },
  });
  expect(createResponse.status()).toBe(201);
  const { job } = await createResponse.json();
  const otherContext = await newContextWithIp(browser);
  const other = await otherContext.newPage();
  try {
    await signUp(other, uniqueEmail("job-outsider"));
    const foreign = await other.request.patch(`/api/jobs/${job.id}`, {
      headers: sameOrigin,
      data: { title: "Should not be visible" },
    });
    expect(foreign.status()).toBe(404);
  } finally {
    await otherContext.close();
  }

  const publishResponse = await page.request.post(
    `/api/jobs/${job.id}/publish`,
    { headers: sameOrigin },
  );
  expect(publishResponse.status()).toBe(200);
  expect(await publishResponse.json()).toMatchObject({
    job: { status: "pending_moderation" },
  });
});

test("public catalog lists published jobs, filters, and opens detail accessibly", async ({ page }) => {
  const response = await page.request.get("/api/jobs?limit=10", { headers: sameOrigin });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { items: Array<{ id: string }> };
  await page.goto("/en/jobs");
  await expect(page.getByRole("heading", { name: "Remote jobs" })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations.filter((issue) => issue.impact === "critical")).toEqual([]);
  if (body.items[0]) {
    const detail = await page.request.get(`/api/jobs/${body.items[0].id}`, { headers: sameOrigin });
    expect(detail.ok()).toBeTruthy();
    await page.goto(`/en/jobs/${body.items[0].id}`);
    await expect(page.locator("h1")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations.filter((issue) => issue.impact === "critical")).toEqual([]);
  }
  expect((await page.request.get("/api/jobs?workFormat=remote&postedWithin=30&limit=5", { headers: sameOrigin })).ok()).toBeTruthy();
});

test("a guest cannot read an unpublished job", async ({ page }) => {
  const email = uniqueEmail("catalog-draft");
  await signUp(page, email);
  const companyResponse = await page.request.post("/api/companies", { headers: sameOrigin, data: { name: `Catalog ${Date.now()}` } });
  expect(companyResponse.status()).toBe(201);
  const { company } = await companyResponse.json();
  const response = await page.request.post("/api/jobs", { headers: sameOrigin, data: {
    companyId: company.id, title: "Private draft engineer",
    description: "A private draft verifying that an unrelated visitor cannot discover unpublished job details.",
    category: "engineering", workFormat: "remote", employmentType: "full_time", applicationMethod: "internal",
  } });
  expect(response.status()).toBe(201);
  const { job } = await response.json();
  const otherContext = await newContextWithIp(page.context().browser()!);
  try {
    const guest = await otherContext.newPage();
    expect((await guest.request.get(`/api/jobs/${job.id}`, { headers: sameOrigin })).status()).toBe(404);
  } finally { await otherContext.close(); }
});
