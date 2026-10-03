import { expect, test } from "./fixtures";

const sameOrigin = { origin: "http://127.0.0.1:3000" };

test("8A: fixture import publishes jobs that apply on the source site", async ({
  page,
}) => {
  const secret = process.env.CRON_SECRET;
  test.skip(!secret, "CRON_SECRET is set by scripts/ci-db.sh");

  expect((await page.request.get("/api/cron/import")).status()).toBe(404);
  expect(
    (
      await page.request.get("/api/cron/import", {
        headers: { authorization: "Bearer wrong" },
      })
    ).status(),
  ).toBe(404);
  const cron = await page.request.get("/api/cron/import", {
    headers: { authorization: `Bearer ${secret}` },
  });
  expect(cron.status()).toBe(200);

  await page.goto("/en/jobs?q=Illustration%20Designer");
  await page.getByRole("link", { name: "Illustration Designer" }).click();
  await expect(page).toHaveURL(/\/en\/jobs\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Imported from")).toBeVisible();
  await expect(page.getByRole("link", { name: "Apply" })).toHaveAttribute(
    "href",
    "https://amber.invalid/jobs/illustrator",
  );

  const jobId = page.url().split("/").pop()!;
  const apply = await page.request.post(`/api/jobs/${jobId}/apply-external`, {
    headers: sameOrigin,
  });
  expect(apply.status()).toBe(200);
  expect(await apply.json()).toEqual({
    externalUrl: "https://amber.invalid/jobs/illustrator",
  });

  // The scam fixture never reaches the public catalog.
  await page.goto("/en/jobs?q=Remote%20Training%20Associate");
  await expect(
    page.getByRole("link", { name: "Remote Training Associate" }),
  ).toHaveCount(0);
});
