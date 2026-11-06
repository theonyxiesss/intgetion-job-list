import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

// TZ 53: the home page is the platform chat in the Morrow style.
test("home is the chat with the side menu (English)", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Spoki Assistant",
  );
  await expect(page.getByLabel("Write a message")).toBeVisible();
  const menu = page.getByRole("complementary");
  for (const name of [
    "Find a job",
    "Find freelance work",
    "Events",
    "Saved jobs",
    "My applications",
    "Post a job",
  ]) {
    await expect(menu.getByRole("button", { name })).toBeVisible();
  }
  // The site header and footer are not shown under the chat.
  await expect(page.getByRole("banner")).toBeHidden();
  await expect(page.locator("footer")).toBeHidden();
});

test("home is the chat with the side menu (Russian)", async ({ page }) => {
  await page.goto("/ru");
  await expect(page.getByLabel("Напишите сообщение")).toBeVisible();
  await expect(
    page
      .getByRole("complementary")
      .getByRole("button", { name: /Найти работу/ }),
  ).toBeVisible();
});

test("a side menu item asks the chat (TZ 53)", async ({ page }) => {
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
  await page
    .getByRole("complementary")
    .getByRole("button", { name: /Find a job/ })
    .click();
  await expect(page.getByText("Stubbed answer.")).toBeVisible();
  expect(sent.map((body) => body.text)).toEqual([
    "Find jobs that match my profile",
  ]);
  await expect(page).not.toHaveURL(/profile/);
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
