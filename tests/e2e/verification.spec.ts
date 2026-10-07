import type { Page } from "@playwright/test";
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
  await page.goto(authLink(await waitForMail(page.request, email)));
  await expect(page).toHaveURL(/\/en\/auth\/(confirmed|signed-in)/);
}

test("10B: the owner starts domain verification; free mail and strangers are refused", async ({
  page,
  browser,
}) => {
  await signUp(page, uniqueEmail("verify-owner"));
  const domain = `verify-${Date.now()}.example.com`;
  const created = await page.request.post("/api/companies", {
    headers: sameOrigin,
    data: { name: `Verify Co ${Date.now()}`, domain },
  });
  expect(created.status()).toBe(201);
  const { company } = await created.json();
  const base = `/api/companies/${company.id}/verification`;

  const free = await page.request.post(base, {
    headers: sameOrigin,
    data: { method: "corporate_email", target: "boss@gmail.com" },
  });
  expect(free.status()).toBe(422);
  expect((await free.json()).error.code).toBe("FREE_EMAIL_DOMAIN");

  const dns = await page.request.post(base, {
    headers: sameOrigin,
    data: { method: "dns_txt" },
  });
  expect(dns.status()).toBe(201);
  const { dnsRecord } = await dns.json();
  expect(dnsRecord).toMatch(/^intgetion-verify=[\w-]{43}$/);

  const wrong = await page.request.post(`${base}/confirm`, {
    headers: sameOrigin,
    data: { token: "x".repeat(43) },
  });
  expect(wrong.status()).toBe(404);

  const state = await (await page.request.get(base)).json();
  expect(state).toMatchObject({
    companyStatus: "unverified",
    domain,
    steps: { domainConfirmed: false, firstJobModerated: false },
    latest: { method: "dns_txt", status: "pending" },
  });

  await page.goto("/en/employer/company/verify");
  // UI-3: the company name is the H1; the verification tab is current.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    company.name,
  );
  await expect(
    page.getByRole("link", { name: "Verification" }),
  ).toHaveAttribute("aria-current", "page");

  const stranger = await newContextWithIp(browser);
  try {
    const other = await stranger.newPage();
    await signUp(other, uniqueEmail("verify-stranger"));
    expect((await other.request.get(base)).status()).toBe(404);
    expect(
      (
        await other.request.post(base, {
          headers: sameOrigin,
          data: { method: "dns_txt" },
        })
      ).status(),
    ).toBe(404);
  } finally {
    await stranger.close();
  }
});
