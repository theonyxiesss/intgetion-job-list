import type { Page } from "@playwright/test";
import { consentCookie, expect, test, testIp } from "./fixtures";

/**
 * D525: one Spoki beside every page. Runs against the server started with
 * SPOKI_DOCK=true (CI, port 3200); the other suites keep the panel off.
 * No model in CI: the answer stream is stubbed, slow on purpose, so a page
 * change can happen while it is still coming.
 */
const DOCK = "http://127.0.0.1:3200";

test.skip(!process.env.CI, "the server with SPOKI_DOCK=true is started in CI");

test.use({ baseURL: DOCK });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ ...consentCookie, url: DOCK }]);
  await context.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
});

const panel = (page: Page) =>
  page.getByRole("complementary", { name: "Spoki assistant panel" });
/** The field in any mode: the panel is a dialog over the page below 1536 px. */
const field = (page: Page) =>
  page.locator("#spoki-panel").getByLabel("Write a message");
const railLink = (page: Page, href: string) =>
  page.locator(`[data-rail] a[href="${href}"]`);

/** A slow answer: Spoki is still writing when the page changes. */
async function stubSlowAnswer(page: Page, sent: unknown[]) {
  await page.route("**/api/bot/message", async (route) => {
    sent.push(route.request().postDataJSON());
    await new Promise((resolve) => setTimeout(resolve, 2500));
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body:
        'event: token\ndata: {"type":"token","text":"Stubbed answer."}\n\n' +
        'event: done\ndata: {"type":"done","conversationId":"00000000-0000-4000-8000-000000000000"}\n\n',
    });
  });
}

/** Marks the field's DOM node: the same mark later means the same chat. */
async function markField(page: Page) {
  await field(page).evaluate((node) => {
    node.setAttribute("data-probe", "one-chat");
  });
}

async function expectSameChat(page: Page) {
  await expect(field(page)).toHaveAttribute("data-probe", "one-chat");
  await expect(page.locator("#spoki-panel")).toHaveCount(1);
  await expect(page.getByRole("log", { name: "Conversation" })).toHaveCount(1);
}

test("wide screen: the panel sits beside the page and keeps one chat across pages, an answer and full screen", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1600, height: 900 });
  const sent: unknown[] = [];
  await stubSlowAnswer(page, sent);

  await page.goto("/en/jobs");
  // A guest starts with the panel closed (D525).
  await expect(panel(page)).toBeHidden();
  // The catalog no longer repeats Spoki in a card; its actions stay.
  await expect(
    page.getByRole("heading", { name: "Let Spoki find jobs" }),
  ).toHaveCount(0);

  await page.getByRole("link", { name: "Chat with the agent" }).click();
  await expect(field(page)).toBeVisible();
  await expect(page).toHaveURL(/\/jobs$/);
  // Part of the layout: the page ends where the panel starts.
  const box = await panel(page).boundingBox();
  expect(box?.width).toBe(400);
  const heading = await page
    .getByRole("heading", { level: 1, name: "Remote jobs" })
    .boundingBox();
  expect((heading?.x ?? 0) + (heading?.width ?? 0)).toBeLessThanOrEqual(
    box?.x ?? 0,
  );

  await markField(page);
  await field(page).fill("A draft that must stay");
  await railLink(page, "/events").click();
  await expect(page).toHaveURL(/\/events$/);
  await expect(field(page)).toHaveValue("A draft that must stay");
  await expectSameChat(page);

  // An answer still coming survives a page change.
  await field(page).fill("Which events are next week?");
  await field(page).press("Enter");
  await expect
    .poll(() => sent.length, { message: "the question was sent" })
    .toBe(1);
  expect(sent[0]).toMatchObject({ section: "events" });
  await railLink(page, "/freelance").click();
  await expect(page).toHaveURL(/\/freelance$/);
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByText("Which events are next week?")).toBeVisible();
  await expect(log.getByText("Stubbed answer.")).toBeVisible();
  await expectSameChat(page);

  // Full screen is the same chat at /chat, and back again.
  await field(page).fill("Kept through full screen");
  await page.getByRole("button", { name: "Open Spoki full screen" }).click();
  await expect(page).toHaveURL(/\/chat$/);
  expect((await panel(page).boundingBox())?.width).toBe(1600);
  await expect(field(page)).toHaveValue("Kept through full screen");
  await expectSameChat(page);
  await page.getByRole("button", { name: "Back to the page" }).click();
  await expect(page).toHaveURL(/\/freelance$/);
  await expect(field(page)).toHaveValue("Kept through full screen");
  await expect(log.getByText("Stubbed answer.")).toBeVisible();
  await expectSameChat(page);
});

test("wide screen: a closed panel stays closed after a reload", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/en/events");
  await page.getByRole("link", { name: "Chat with the agent" }).click();
  await expect(field(page)).toBeVisible();
  await page.getByRole("button", { name: "Close Spoki" }).click();
  await expect(panel(page)).toBeHidden();
  const cookies = await context.cookies(DOCK);
  expect(cookies.find((cookie) => cookie.name === "spoki_dock")?.value).toBe(
    "closed",
  );
  await page.reload();
  await expect(panel(page)).toBeHidden();
  // Opened again, the choice is kept the other way.
  await page.getByRole("link", { name: "Chat with the agent" }).click();
  await expect(field(page)).toBeVisible();
  await page.reload();
  await expect(field(page)).toBeVisible();
});

test("1280 px: Spoki opens over the page, Esc closes it and the focus goes back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/en/jobs");
  const trigger = page.getByRole("link", { name: "Chat with the agent" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Spoki assistant panel" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Write a message")).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box?.width).toBe(400);
  expect(box?.x).toBe(880);
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("phone: the tab bar opens Spoki over the page, another tab closes it, the draft stays", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/freelance");
  const tabs = page.getByRole("navigation", { name: "Main sections" });
  await tabs.getByRole("link", { name: "Spoki" }).click();
  await expect(page).toHaveURL(/\/freelance$/);
  await expect(field(page)).toBeVisible();
  const box = await page.locator("#spoki-panel").boundingBox();
  expect(box?.width).toBe(390);
  // Not a modal dialog: the tab bar stays usable and readable beside it.
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const bar = await tabs.boundingBox();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(bar?.y ?? 0);
  await markField(page);
  await field(page).fill("Phone draft");
  // No full-screen button on a phone: it already is.
  await expect(
    page.getByRole("button", { name: "Open Spoki full screen" }),
  ).toBeHidden();

  // While writing, the tab bar steps aside for the keyboard (D468); the
  // person closes the keyboard first, as on a real phone.
  await field(page).blur();
  await expect(tabs).toBeVisible();
  await tabs.getByRole("link", { name: "Jobs" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(field(page)).toBeHidden();
  await tabs.getByRole("link", { name: "Spoki" }).click();
  await expect(field(page)).toHaveValue("Phone draft");
  await expectSameChat(page);
});

test("a job's button opens that job's thread in the panel; /chat?job= does the same full screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/en/jobs");
  // The first vacancy link: `/jobs/<uuid>`, not the RSS feed or a filter.
  const hrefs = await page
    .locator('a[href^="/jobs/"]')
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  const jobId =
    hrefs
      .map((href) => href?.split("/").pop() ?? "")
      .find((id) => /^[0-9a-f-]{36}$/.test(id)) ?? "";
  expect(jobId).toMatch(/^[0-9a-f-]{36}$/);
  await page.goto(`/en/jobs/${jobId}`);
  await page.getByRole("link", { name: "Talk to the assistant" }).click();
  // The page stays; the panel opens on the vacancy.
  await expect(page).toHaveURL(new RegExp(`/jobs/${jobId}$`));
  await expect(panel(page).getByText(/^Discussing: /)).toBeVisible();

  await page.goto(`/en/chat?job=${jobId}`);
  await expect(panel(page).getByText(/^Discussing: /)).toBeVisible();
  expect((await panel(page).boundingBox())?.width).toBe(1600);
  await expect(page.getByRole("log", { name: "Conversation" })).toHaveCount(1);
});
