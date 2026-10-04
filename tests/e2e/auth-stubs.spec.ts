import { expect, test } from "./fixtures";

// D200: Google and X sign-in are placeholders until V2 OAuth.
for (const path of ["/en/login", "/en/register"]) {
  test(`${path} shows disabled Google and X sign-in`, async ({ page }) => {
    await page.goto(path);
    for (const name of ["Continue with Google", "Continue with X"]) {
      await expect(page.getByRole("button", { name })).toBeDisabled();
    }
  });
}
