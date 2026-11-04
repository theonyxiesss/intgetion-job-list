import { randomUUID } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import pg from "pg";
import { expect, test } from "./fixtures";

/** Published jobs of one verified company, more than the top three. */
async function seedPublishedJobs(count: number) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL is required for home e2e.");
  const userId = randomUUID();
  const companyId = randomUUID();
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    await client.query(
      `insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
       values ($1, $2, now(), 'home')`,
      [userId, randomUUID()],
    );
    await client.query(
      `insert into public.companies (id, name, slug, status, created_by)
       values ($1, 'Home Co', $2, 'verified', $3)`,
      [companyId, `home-${companyId.slice(0, 8)}`, userId],
    );
    for (let index = 0; index < count; index += 1) {
      await client.query(
        `insert into public.jobs (
           id, company_id, created_by, title, description, category,
           work_format, employment_type, application_method, source, status,
           published_at, expires_at
         ) values ($1, $2, $3, $4,
           'Work with a distributed team across European working hours.',
           'engineering', 'remote', 'full_time', 'internal', 'internal',
           'published', now(), now() + interval '30 days')`,
        [randomUUID(), companyId, userId, `Home e2e role ${index}`],
      );
    }
  } finally {
    await client.end();
  }
}

test("home renders the English shell", async ({ page }) => {
  await page.goto("/en");
  // The hero heading since D601.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "One platform for remote work",
  );
  // The footer repeats the logo link; this one is the header's.
  await expect(
    page.getByRole("banner").getByRole("link", { name: "INTGETION JOB LIST" }),
  ).toBeVisible();
});

test("home renders the Russian shell", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Одна платформа для удалённой работы",
  );
});

test("home is the platform: service tiles, top jobs, FAQ, footer (D601)", async ({
  page,
}) => {
  await seedPublishedJobs(4);
  await page.goto("/en");
  // One tile per service, each with a way in for both sides.
  for (const name of [
    "Remote jobs",
    "Freelance with a clear price",
    "UGC videos for brands",
    "Events and conferences",
  ]) {
    await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  }
  await expect(
    page.getByRole("link", { name: "Find a freelancer" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Make UGC videos" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Top jobs" })).toBeVisible();
  // Three top jobs and the catalog link, not the long feed of D332.
  await expect(page.locator("#all-jobs")).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Show more jobs" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  const question = page.getByText("Is it free?");
  await question.click();
  await expect(
    page.getByText(/Searching, applying and posting jobs are free/),
  ).toBeVisible();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator("footer")).toBeInViewport();
});

test("the home field hands the task to Spoki, not the address (D601)", async ({
  page,
}) => {
  const sent: { text?: string }[] = [];
  await page.route("**/api/bot/message", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body:
        'event: token\ndata: {"type":"token","text":"Stubbed answer."}\n\n' +
        'event: done\ndata: {"type":"done","conversationId":"00000000-0000-4000-8000-000000000000"}\n\n',
    });
  });
  await page.goto("/en");
  await page.getByLabel("Tell Spoki what you need").fill("Find me a designer");
  await page.getByRole("button", { name: "Ask Spoki" }).click();
  await expect(page.getByText("Stubbed answer.")).toBeVisible();
  expect(sent.map((body) => body.text)).toEqual(["Find me a designer"]);
  await expect(page).not.toHaveURL(/designer/);
});

test("unknown routes use the localized not-found page", async ({ page }) => {
  const response = await page.goto("/en/missing-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
});

test("home has no critical axe violations", async ({ page }) => {
  await page.goto("/en");
  const results = await new AxeBuilder({ page }).analyze();
  const critical = results.violations.filter(
    (violation) => violation.impact === "critical",
  );
  expect(critical).toEqual([]);
});

for (const path of ["/en/login", "/en/register", "/en/reset-password"]) {
  test(`${path} has no critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === "critical",
    );
    expect(critical).toEqual([]);
  });
}
