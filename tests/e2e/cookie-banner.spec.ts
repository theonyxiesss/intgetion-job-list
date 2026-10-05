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
    ).toMatch(new RegExp(`^${value}~`));
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(banner).toHaveCount(0);
    await context.close();
  });
}

// D219: "Customize" stores one category; preferences remember catalog filters.
test("customize stores preferences only and brings back the last filters", async ({
  browser,
}) => {
  const context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
    extraHTTPHeaders: { "x-forwarded-for": testIp() },
  });
  const page = await context.newPage();
  await page.goto("/en/jobs");
  const banner = page.getByRole("region", { name: "Cookie choice" });
  await banner.getByRole("button", { name: "Customize" }).click();
  await banner.getByRole("checkbox", { name: /Preferences/ }).check();
  await banner.getByRole("button", { name: "Save choice" }).click();
  await expect(banner).toHaveCount(0);
  const consent = (await context.cookies()).find(
    (cookie) => cookie.name === "cookie_consent",
  );
  expect(consent?.value).toMatch(/^preferences~/);

  await page.goto("/en/jobs?workFormat=remote");
  await expect
    .poll(async () =>
      (await context.cookies()).some(
        (cookie) => cookie.name === "last_catalog_query",
      ),
    )
    .toBe(true);
  await page.goto("/en/jobs");
  const restore = page.getByRole("link", {
    name: "Bring back your last filters",
  });
  await expect(restore).toBeVisible();
  await restore.click();
  await expect(page).toHaveURL(/workFormat=remote/);
  await context.close();
});

test("without preferences consent the catalog stores nothing", async ({
  page,
  context,
}) => {
  // The fixture's choice is "necessary".
  await page.goto("/en/jobs?workFormat=remote");
  await page.goto("/en/jobs");
  expect(
    (await context.cookies()).some(
      (cookie) => cookie.name === "last_catalog_query",
    ),
  ).toBe(false);
  await expect(
    page.getByRole("link", { name: "Bring back your last filters" }),
  ).toHaveCount(0);
});
