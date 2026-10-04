import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// D204: the employers page and the RSS feed.
test("a guest reaches the employers page from the header", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "For employers" })
    .click();
  await expect(page).toHaveURL(/\/en\/for-employers$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hire remote people who fit your time zone",
  );
  await expect(
    page.getByRole("link", { name: "Post a job" }).first(),
  ).toHaveAttribute("href", "/en/register");
  await page.getByText("How much does it cost?").click();
  await expect(page.getByText("Posting is free for now.")).toBeVisible();

  const axe = await new AxeBuilder({ page }).analyze();
  expect(
    axe.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

test("the jobs RSS feed is valid RSS for both locales", async ({ request }) => {
  for (const locale of ["en", "ru"]) {
    const response = await request.get(`/${locale}/jobs/rss.xml`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");
    const body = await response.text();
    expect(body).toContain('<rss version="2.0"');
    expect(body).toContain(`<language>${locale}</language>`);
  }
  expect((await request.get("/de/jobs/rss.xml")).status()).toBe(404);
});
