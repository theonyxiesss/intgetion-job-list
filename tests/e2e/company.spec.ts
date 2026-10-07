import type { Browser, Page } from "@playwright/test";
import { expect, newContextWithIp, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

const sameOrigin = { origin: "http://127.0.0.1:3000" };
const password = "orbit-lantern-42";

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function signUp(page: Page, email: string) {
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en\/auth\/(confirmed|signed-in)/);
}

async function newUserPage(browser: Browser) {
  const context = await newContextWithIp(browser);
  const page = await context.newPage();
  await signUp(page, uniqueEmail("employer"));
  return { context, page };
}

test("P2: employer creates and edits a company; another user receives 404", async ({
  browser,
  page,
}) => {
  await signUp(page, uniqueEmail("company-owner"));
  const created = await page.request.post("/api/companies", {
    headers: sameOrigin,
    data: {
      name: `Test Company ${Date.now()}`,
      domain: `test-${Date.now()}.example.com`,
      description: "Initial description",
    },
  });
  expect(created.status()).toBe(201);
  const { company } = await created.json();
  const me = await (await page.request.get("/api/me")).json();
  expect(me.companies).toEqual([
    { id: company.id, name: company.name, role: "owner" },
  ]);
  const edited = await page.request.patch(`/api/companies/${company.id}`, {
    headers: sameOrigin,
    data: { description: "Edited by the company owner" },
  });
  expect(edited.status()).toBe(200);
  expect(await edited.json()).toMatchObject({
    company: { description: "Edited by the company owner" },
  });

  const other = await newUserPage(browser);
  try {
    const foreign = await other.page.request.patch(
      `/api/companies/${company.id}`,
      {
        headers: sameOrigin,
        data: { description: "Must stay private" },
      },
    );
    expect(foreign.status()).toBe(404);
  } finally {
    await other.context.close();
  }
});
