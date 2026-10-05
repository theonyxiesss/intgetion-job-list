import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

// D201, D219, D220: the cookie choice can be changed in privacy settings
// and follows the signed-in user to a new device.
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
  await expect(section.getByLabel(/Necessary/)).toBeChecked();
  await expect(section.getByLabel(/Necessary/)).toBeDisabled();
  await expect(section.getByLabel(/Preferences/)).not.toBeChecked();
  await section.getByLabel(/Preferences/).check();
  await expect(section.getByText("Saved.")).toBeVisible();
  const consentOf = async (from = context) =>
    (await from.cookies()).find((cookie) => cookie.name === "cookie_consent")
      ?.value;
  await expect.poll(() => consentOf()).toMatch(/^preferences~/);

  await page.reload();
  await expect(
    page.getByRole("region", { name: "Cookies" }).getByLabel(/Preferences/),
  ).toBeChecked();

  // D220: on a new device the signed-in user starts from the journaled choice.
  const browser = context.browser()!;
  const device = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  await device.addCookies(
    (await context.cookies()).filter(
      (cookie) => cookie.name !== "cookie_consent",
    ),
  );
  const other = await device.newPage();
  await other.goto("/en/jobs");
  await expect
    .poll(() => consentOf(device), { timeout: 10_000 })
    .toMatch(/^preferences~/);
  await expect(
    other.getByRole("region", { name: "Cookie choice" }),
  ).toHaveCount(0);
  await device.close();
});
