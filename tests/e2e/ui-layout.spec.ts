import { expect, test } from "./fixtures";

test("home and the catalog do not scroll sideways at 360 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const path of ["/en", "/en/jobs"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  }
});

test("phone filters open and close", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en/jobs");
  await page.getByRole("button", { name: "Filters" }).click();
  await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.getByRole("button", { name: "Close" })).toBeHidden();
});

test("the profile page HTML has no style attributes", async ({ page }) => {
  await page.goto("/en/profile");
  const html = await page.content();
  expect(html).not.toContain("style=");
});
