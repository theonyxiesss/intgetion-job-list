import { expect, test } from "./fixtures";

// D587: one set of account plans, the deal commission and one-off purchases.
// docs/PRICING_UX.md, section 2: with payments off nothing is on sale.
test("the pricing page shows four account plans, the commission and one-offs", async ({
  page,
}) => {
  await page.goto("/en/pricing");
  await expect(
    page.getByRole("heading", { level: 1, name: /One account/ }),
  ).toBeVisible();
  for (const name of ["Free", "Plus", "Pro", "Team"]) {
    await expect(
      page.getByRole("heading", { level: 3, name, exact: true }),
    ).toBeVisible();
  }
  // Three paid plans and the eight one-offs that do not sell yet.
  await expect(page.getByText("Coming soon")).toHaveCount(11);

  const freelance = page.getByRole("row", { name: /Freelance order/ });
  await expect(freelance.getByRole("cell")).toHaveText([
    "8%",
    "5%",
    "3%",
    "0%",
  ]);
  await expect(
    page.getByRole("heading", { level: 3, name: "Hire", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("What no plan ever sells")).toBeVisible();

  const ld = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent();
  expect(JSON.parse(ld ?? "{}")["@type"]).toBe("FAQPage");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /:\d+\/pricing$/,
  );
});

test("a guest finds pricing in the menu and on the employers page", async ({
  page,
}) => {
  await page.goto("/en/for-employers");
  await page.getByRole("link", { name: "See pricing" }).click();
  await expect(page).toHaveURL(/:\d+\/pricing\?for=companies$/);
});
