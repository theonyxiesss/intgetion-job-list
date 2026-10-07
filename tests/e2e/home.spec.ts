import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test("home renders the English shell", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Remote jobs",
  );
  await expect(
    page.getByRole("link", { name: "INTGETION JOB LIST" }),
  ).toBeVisible();
});

test("home renders the Russian shell", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Удалённые вакансии",
  );
});

test("home is the job feed: top jobs, the feed, FAQ, footer, no pricing (D332)", async ({
  page,
}) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Top jobs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "All jobs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(page.locator("#home-pricing-title")).toHaveCount(0);
  const question = page.getByText("Is it free?");
  await question.click();
  await expect(
    page.getByText(/Searching, applying and posting jobs are free/),
  ).toBeVisible();
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect(page.locator("footer")).toBeInViewport();
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
