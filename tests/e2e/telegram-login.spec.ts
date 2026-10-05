import { expect, test } from "./fixtures";

test("the Telegram button waits for the mocked bot, then signs in", async ({
  page,
}) => {
  let started = false;
  let polls = 0;
  await page.route("**/api/auth/telegram/pending", async (route) => {
    if (!started) {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "UNAUTHENTICATED", message: "Sign-in failed" },
        }),
      });
      return;
    }
    polls += 1;
    // Mount and the click each poll once. Stay pending until the test
    // has seen the waiting line.
    if (polls < 3) {
      await route.fulfill({
        status: 202,
        contentType: "application/json",
        body: JSON.stringify({ pending: true }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.route("**/api/auth/telegram/start", async (route) => {
    started = true;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: "https://t.me/intgetion_bot?start=login_mocked",
      }),
    });
  });

  await page.goto("/en/login");
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Continue with Telegram" }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(/t\.me\/intgetion_bot/);
  await popup.close();
  await expect(page.getByRole("status")).toContainText("Open Telegram");
  await page.waitForURL(/\/en\/?$/);
});
