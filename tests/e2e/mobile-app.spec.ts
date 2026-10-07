import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { authLink, waitForMail } from "./mail";

// D244: the site can be installed; D245: candidates get a tab bar on phones.
test("the web app manifest, service worker and offline page are served", async ({
  request,
}) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  const body = (await manifest.json()) as {
    display: string;
    icons: { src: string; purpose?: string }[];
  };
  expect(body.display).toBe("standalone");
  expect(body.icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  for (const icon of body.icons) {
    expect((await request.get(icon.src)).ok()).toBeTruthy();
  }
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
  const offline = await request.get("/offline.html");
  expect(await offline.text()).toContain("You are offline");
});

async function signUpCandidate(page: Page) {
  const email = `tabbar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill("orbit-lantern-42");
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/en\/auth\/check-email$/);
  const mail = await waitForMail(page.request, email, 0);
  await page.goto(authLink(mail));
  await expect(page).toHaveURL(/\/en\/auth\/confirmed$/);
  await page.goto("/en/profile/edit");
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByLabel("Headline").fill("Engineer");
  await page.getByLabel("Desired titles").fill("Backend engineer");
  await page.getByRole("textbox", { name: /^Timezone/ }).fill("Europe/Berlin");
  await page.getByLabel("I confirm this timezone").check();
  await page.getByLabel("Years of experience").fill("5");
  await page
    .getByRole("textbox", { name: /^Skills/ })
    .fill("React, TypeScript");
  await page.getByLabel("Remote").check();
  await page.getByLabel("Full time").check();
  await page.getByLabel("Language code").fill("en");
  await page.getByLabel("Minimum salary, minor units").fill("100000");
  await page.getByLabel("Salary currency").fill("EUR");
  await page.getByLabel("Contact email").fill(email);
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page).toHaveURL(/\/en\/profile$/);
}

test("a candidate on a phone gets the tab bar; a guest does not", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/en/jobs");
  await expect(
    page.getByRole("navigation", { name: "Main sections" }),
  ).toHaveCount(0);

  await signUpCandidate(page);
  await page.goto("/en/jobs");
  const tabs = page.getByRole("navigation", { name: "Main sections" });
  await expect(tabs).toBeVisible();
  await expect(tabs.getByRole("link")).toHaveCount(5);
  for (const link of await tabs.getByRole("link").all()) {
    const box = await link.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  await expect(tabs.getByRole("link", { name: "Jobs" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Nothing hides under the bar and nothing scrolls sideways.
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(tabs).toBeHidden();
});
