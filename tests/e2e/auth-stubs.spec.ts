import { expect, test } from "./fixtures";

// D200: Google and X stay placeholders. Telegram is the bot button (D258).
for (const path of ["/en/login", "/en/register"]) {
  test(`${path} shows disabled Google and X, and a Telegram button`, async ({
    page,
  }) => {
    await page.goto(path);
    for (const name of ["Continue with Google", "Continue with X"]) {
      await expect(page.getByRole("button", { name })).toBeDisabled();
    }
    await expect(
      page.getByRole("button", { name: "Continue with Telegram" }),
    ).toBeEnabled();
  });
}
