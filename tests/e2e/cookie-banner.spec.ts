import { expect, test, testIp } from "./fixtures";

// D201: the banner shows until a choice is made and stays gone after it.
for (const [button, value] of [
  ["Necessary only", "necessary"],
  ["Accept all", "all"],
] as const) {
  test(`"${button}" stores ${value} and hides the banner`, async ({
    browser,
  }) => {
    // A context without the fixture's consent cookie.
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3000",
      extraHTTPHeaders: { "x-forwarded-for": testIp() },
    });
    const page = await context.newPage();
    await page.goto("/en");
    const banner = page.getByRole("region", { name: "Cookie choice" });
    await expect(banner).toBeVisible();
    await banner.getByRole("button", { name: button }).click();
    await expect(banner).toHaveCount(0);
    const cookies = await context.cookies();
    expect(
      cookies.find((cookie) => cookie.name === "cookie_consent")?.value,
    ).toBe(value);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(banner).toHaveCount(0);
    await context.close();
  });
}
