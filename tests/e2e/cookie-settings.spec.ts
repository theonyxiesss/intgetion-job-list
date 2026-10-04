import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

// D201: the cookie choice can be changed in privacy settings.
test("a user changes the cookie choice in privacy settings", async ({
  page,
  context,
}) => {
  test.setTimeout(90_000);
  const email = `cookies-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill("orbit-lantern-42");
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en$/);

  await page.goto("/en/settings/privacy");
  const section = page.getByRole("region", { name: "Cookies" });
  await expect(section.getByLabel("Necessary only")).toBeChecked();
  await section.getByLabel("Allow all").check();
  await expect(section.getByText("Saved.")).toBeVisible();
  const cookies = await context.cookies();
  expect(
    cookies.find((cookie) => cookie.name === "cookie_consent")?.value,
  ).toBe("all");

  await page.reload();
  await expect(
    page.getByRole("region", { name: "Cookies" }).getByLabel("Allow all"),
  ).toBeChecked();
});
