import { expect, test } from "./fixtures";

// D241: the terms and the privacy policy are public pages linked from the
// footer, the cookie banner and the registration form.
test("legal pages render and are linked where people consent", async ({
  page,
}) => {
  await page.goto("/en/terms");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Terms of Use",
  );

  await page.goto("/en/privacy");
  await expect(page.locator("#cookies")).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "_ia", exact: true }),
  ).toBeVisible();
  // The cookie choice works here for guests too.
  await expect(
    page
      .locator("#cookie-settings")
      .getByRole("checkbox", { name: /Analytics/ }),
  ).toBeVisible();

  const footer = page.locator("footer");
  await expect(
    footer.getByRole("link", { name: "Terms of Use" }),
  ).toHaveAttribute("href", "/en/terms");
  await expect(
    footer.getByRole("link", { name: "Privacy Policy" }),
  ).toHaveAttribute("href", "/en/privacy");

  await page.goto("/en/register");
  const consent = page.locator("form label", { hasText: "I accept" });
  await expect(
    consent.getByRole("link", { name: "terms of use" }),
  ).toHaveAttribute("href", "/en/terms");
  await expect(
    consent.getByRole("link", { name: "privacy policy" }),
  ).toHaveAttribute("href", "/en/privacy");
});
