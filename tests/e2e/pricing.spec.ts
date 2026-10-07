import { expect, test } from "./fixtures";

// docs/PRICING_UX.md, section 2: the pricing page sells nothing yet.
test("the pricing page shows three plans per audience and sells nothing yet", async ({
  page,
}) => {
  await page.goto("/en/pricing");
  await expect(
    page.getByRole("heading", { level: 1, name: /Free for everything/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Plus" }),
  ).toBeVisible();
  await expect(page.getByText("Coming soon")).toHaveCount(2);

  await page.getByRole("link", { name: "For companies" }).click();
  await expect(page).toHaveURL(/for=companies/);
  await expect(
    page.getByRole("heading", { level: 3, name: "Hire" }),
  ).toBeVisible();
  await expect(page.getByText("What no plan ever sells")).toBeVisible();

  const ld = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(JSON.parse(ld ?? "{}")["@type"]).toBe("FAQPage");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/en\/pricing$/,
  );
});

test("a guest finds pricing in the menu and on the employers page", async ({
  page,
}) => {
  await page.goto("/en/for-employers");
  await page.getByRole("link", { name: "See pricing" }).click();
  await expect(page).toHaveURL(/\/en\/pricing\?for=companies$/);
});
