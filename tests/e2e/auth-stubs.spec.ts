import { expect, test } from "./fixtures";

// D335, D336: Google, X, and Telegram are real buttons.
for (const path of ["/en/login", "/en/register"]) {
  test(`${path} offers Google, X, and Telegram`, async ({ page }) => {
    await page.goto(path);
    const google = page.getByRole("link", { name: "Continue with Google" });
    await expect(google).toHaveAttribute(
      "href",
      /\/api\/auth\/google\?locale=en/,
    );
    const x = page.getByRole("link", { name: "Continue with X" });
    await expect(x).toHaveAttribute("href", /\/api\/auth\/x\?locale=en/);
    await expect(
      page.getByRole("button", { name: "Continue with Telegram" }),
    ).toBeEnabled();
  });
}
