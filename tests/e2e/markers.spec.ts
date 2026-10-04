import { expect, test } from "./fixtures";

test("catalog chips, a tag page, and a narrow viewport", async ({ page }) => {
  await page.goto("/en/jobs");
  await expect(page.getByRole("link", { name: "For you" })).toBeVisible();
  await expect(page.getByText(/Show more/)).toBeVisible();
  await page.goto("/en/jobs/t/web3");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Web3");
  await page.setViewportSize({ width: 360, height: 800 });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflow).toBe(false);
});

test("creating a job accepts sectors and a crypto-pay perk", async ({
  page,
}) => {
  const email = `markers-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill("orbit-lantern-42");
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const { authLink, waitForMail } = await import("./mail");
  const mail = await waitForMail(page.request, email);
  await page.goto(authLink(mail));
  const companyResponse = await page.request.post("/api/companies", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {
      name: `Markers Co ${Date.now()}`,
      domain: `markers-${Date.now()}.example.com`,
      description: "A company for marker tests",
    },
  });
  expect(companyResponse.status()).toBe(201);
  const { company } = await companyResponse.json();
  const createResponse = await page.request.post("/api/jobs", {
    headers: { origin: "http://127.0.0.1:3000" },
    data: {
      companyId: company.id,
      title: `Web3 counsel ${Date.now()}`,
      description:
        "Review token agreements and support a distributed legal team on protocol launches.",
      category: "legal",
      employmentType: "freelance",
      workFormat: "remote",
      applicationMethod: "internal",
      sectors: ["web3"],
      perks: ["crypto-pay"],
      seniority: "senior",
      skills: [],
      languages: [],
    },
  });
  expect(createResponse.status()).toBe(201);
  const { job } = await createResponse.json();
  expect(job.sectors).toEqual(["web3"]);
  expect(job.perks).toEqual(["crypto-pay"]);
  const publishResponse = await page.request.post(
    `/api/jobs/${job.id}/publish`,
    { headers: { origin: "http://127.0.0.1:3000" } },
  );
  expect(publishResponse.status()).toBe(200);
  expect(await publishResponse.json()).toMatchObject({
    job: { status: "pending_moderation" },
  });
});
