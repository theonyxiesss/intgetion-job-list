import type { Page, Route } from "@playwright/test";
import { consentCookie, expect, test, testIp } from "./fixtures";

/**
 * D523: Spoki blocks in the panel, full screen, a tablet and a phone. Runs
 * on the CI server with SPOKI_DOCK=true. No model in CI: the answer stream
 * and the thread are stubbed with blocks in the server's format; the
 * server's own checks (owner, journal, stale writes) are in
 * `ui-blocks.integration.test.ts`. One real call checks the button route.
 */
const DOCK = "http://127.0.0.1:3200";

test.skip(!process.env.CI, "the server with SPOKI_DOCK=true is started in CI");

test.use({ baseURL: DOCK });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ ...consentCookie, url: DOCK }]);
  await context.setExtraHTTPHeaders({ "x-forwarded-for": testIp() });
});

const JOB = "11111111-1111-4111-8111-111111111111";
const CALC = "22222222-2222-4222-8222-222222222222";
const CARDS = "33333333-3333-4333-8333-333333333333";
const PLANS = "44444444-4444-4444-8444-444444444444";

const panel = (page: Page) => page.locator("#spoki-panel");
const field = (page: Page) => panel(page).getByLabel("Write a message");
const log = (page: Page) => page.getByRole("log", { name: "Conversation" });

function source(tool: string, ttlSec: number, minutesAgo = 0) {
  return {
    tool,
    at: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    ttlSec,
  };
}

const calculator = {
  v: 1,
  id: CALC,
  component: "calculator",
  props: {
    formula: "hiring_cost",
    inputs: [{ name: "jobsPerMonth", min: 1, max: 20, step: 1, value: 2 }],
    billing: "month",
    prices: { hireCents: 7900, teamMonthCents: 19900, teamYearCents: 199000 },
    actions: ["post"],
  },
  source: source("show_ui", 86400),
  fallback: { text: "2 jobs a month: Hire $158, Team $199. Hire costs less." },
  actions: [
    { id: "post", type: "link", label: "Post a job", path: "/post-job" },
  ],
};

function jobCards(minutesAgo: number) {
  return {
    v: 1,
    id: CARDS,
    component: "job_cards",
    props: {
      items: [
        {
          id: JOB,
          title: "Solidity Engineer",
          company: "Acme",
          actions: [`open:${JOB}`, `save:${JOB}`, `apply:${JOB}`],
        },
      ],
    },
    source: {
      ...source("search_jobs", 3600, minutesAgo),
      refresh: { tool: "search_jobs", args: {} },
    },
    fallback: { text: "Jobs:\n• Solidity Engineer — Acme", path: "/jobs" },
    actions: [
      { id: `open:${JOB}`, type: "link", label: "Open", path: `/jobs/${JOB}` },
      {
        id: `save:${JOB}`,
        type: "action",
        label: "Save",
        doneLabel: "Saved",
        tool: "save_job",
        args: { jobId: JOB },
        write: true,
      },
      {
        id: `apply:${JOB}`,
        type: "reply",
        label: "Apply",
        text: "I want to apply to “Solidity Engineer”",
      },
      { id: "refresh", type: "refresh", label: "Refresh" },
    ],
  };
}

const plans = {
  v: 1,
  id: PLANS,
  component: "compare_plans",
  props: {
    audience: "companies",
    plans: ["start", "hire", "team"].map((code, index) => ({
      code,
      name: code[0]!.toUpperCase() + code.slice(1),
      priceCents: [null, 7900, 19900][index],
      per: [null, "job", "month"][index],
      points: ["One point"],
      action: `plan:${code}`,
    })),
  },
  source: source("show_ui", 86400),
  fallback: { text: "Plans:", path: "/pricing" },
  actions: ["start", "hire", "team"].map((code) => ({
    id: `plan:${code}`,
    type: "link",
    label: `Choose ${code}`,
    path: "/pricing",
  })),
};

/** One Spoki turn that says a line and draws the given blocks. */
async function stubAnswer(page: Page, blocks: unknown[], sent: unknown[] = []) {
  await page.route("**/api/bot/message", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      headers: { "content-type": "text/event-stream" },
      body:
        'event: token\ndata: {"type":"token","text":"Here it is."}\n\n' +
        blocks
          .map(
            (block) =>
              `event: ui\ndata: ${JSON.stringify({ type: "ui", block })}\n\n`,
          )
          .join("") +
        'event: done\ndata: {"type":"done","conversationId":"00000000-0000-4000-8000-000000000000"}\n\n',
    });
  });
}

/** The thread as the server keeps it: messages and one block between them. */
async function stubThread(page: Page, block: unknown, done: string[] = []) {
  await page.route("**/api/bot/conversation**", async (route: Route) => {
    if (route.request().method() !== "GET") return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        messages: [
          { id: "m1", role: "user", content: "Solidity jobs" },
          { id: "m2", role: "ui", content: "Jobs:", block, done },
          { id: "m3", role: "assistant", content: "One fits you." },
        ],
      }),
    });
  });
}

async function openPanel(page: Page, path = "/en/jobs") {
  await page.goto(path);
  const phone = (page.viewportSize()?.width ?? 1600) < 768;
  // A phone opens Spoki from the tab bar; wider screens from the header.
  await (
    phone
      ? page
          .getByRole("navigation", { name: "Main sections" })
          .getByRole("link", { name: "Spoki" })
      : page.getByRole("link", { name: "Chat with the agent" })
  ).click();
  await expect(field(page)).toBeVisible();
}

async function ask(page: Page, text: string) {
  await field(page).fill(text);
  await field(page).press("Enter");
}

async function noSidewaysScroll(page: Page) {
  const overflow = await panel(page).evaluate((node) => {
    const scroller = node.querySelector('[role="log"]');
    return scroller ? scroller.scrollWidth - scroller.clientWidth : 0;
  });
  expect(overflow).toBeLessThanOrEqual(0);
}

test("wide screen: the calculator counts at once and keeps its values through full screen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  const sent: unknown[] = [];
  await stubAnswer(page, [calculator], sent);
  await openPanel(page);
  await ask(page, "Hire or Team for 5 jobs?");

  const block = panel(page).locator('[data-block="calculator"]');
  await expect(block).toBeVisible();
  // 2 jobs: Hire $158 against Team $199.
  await expect(block.getByText("Hire costs $41 less a month")).toBeVisible();
  const slider = block.getByLabel("Jobs a month");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveValue("5");
  // 5 × $79 = $395; Team is $199: worked out here, no request to Spoki.
  await expect(block.getByText("$395")).toBeVisible();
  await expect(block.getByText("Team costs $196 less a month")).toBeVisible();
  await expect(
    block.getByText("Team pays off from 3 jobs a month"),
  ).toBeVisible();
  expect(sent).toHaveLength(1);

  // Yearly Team: $1,990 / 12 = $165.83 a month.
  await block.getByRole("button", { name: "Yearly" }).click();
  await expect(block.getByText("$165.83")).toBeVisible();

  await block.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect(page).toHaveURL(/\/chat$/);
  expect((await panel(page).boundingBox())?.width).toBe(1600);
  await expect(slider).toHaveValue("5");
  await expect(block.getByRole("button", { name: "Yearly" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // Full screen: no second full-screen button inside the block.
  await expect(
    block.getByRole("button", { name: "Full screen", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Back to the page" }).click();
  await expect(slider).toHaveValue("5");
  await expect(log(page).getByText("Hire or Team for 5 jobs?")).toBeVisible();
});

test("a reload draws the kept cards again, with a saved job still saved", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await stubThread(page, jobCards(5), [`save:${JOB}`]);
  await openPanel(page);
  const cards = panel(page).locator('[data-block="job_cards"]');
  await expect(
    cards.getByRole("link", { name: "Solidity Engineer" }),
  ).toBeVisible();
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();
  // The old messages around the block are where they were.
  await expect(log(page).getByText("Solidity jobs")).toBeVisible();
  await expect(log(page).getByText("One fits you.")).toBeVisible();

  await page.reload();
  await expect(field(page)).toBeVisible();
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(cards.getByText(/^Data as of/)).toHaveCount(0);
});

test("old data is marked, a write waits for a refresh, and the server answers a press", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await stubThread(page, jobCards(120));
  const pressed: unknown[] = [];
  await page.route("**/api/bot/ui/action", async (route) => {
    const body = route.request().postDataJSON() as { actionId: string };
    pressed.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        body.actionId === "refresh"
          ? { kind: "refreshed", block: jobCards(0) }
          : { kind: "done", actionId: body.actionId, label: "Saved" },
      ),
    });
  });
  await openPanel(page);
  const cards = panel(page).locator('[data-block="job_cards"]');
  await expect(cards.getByText(/^Data as of/)).toBeVisible();
  await expect(cards.getByRole("button", { name: "Save" })).toBeDisabled();

  await cards.getByRole("button", { name: "Refresh" }).click();
  await expect(cards.getByText(/^Data as of/)).toHaveCount(0);
  await cards.getByRole("button", { name: "Save" }).click();
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();
  // Only ids go to the server; it keeps the tool and its arguments.
  expect(pressed).toEqual([
    { blockId: CARDS, actionId: "refresh" },
    { blockId: CARDS, actionId: `save:${JOB}` },
  ]);
});

test("a guest's write asks to sign in; Apply goes to Spoki as a message", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await stubThread(page, jobCards(1));
  await page.route("**/api/bot/ui/action", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNAUTHENTICATED" } }),
    }),
  );
  const sent: unknown[] = [];
  await stubAnswer(page, [], sent);
  await openPanel(page);
  const cards = panel(page).locator('[data-block="job_cards"]');
  await cards.getByRole("button", { name: "Save" }).click();
  await expect(cards.getByRole("alert")).toHaveText("Sign in to do this.");

  await cards.getByRole("button", { name: "Apply" }).click();
  await expect
    .poll(() => sent.length, { message: "the reply was sent" })
    .toBe(1);
  expect(sent[0]).toMatchObject({
    text: "I want to apply to “Solidity Engineer”",
  });
  await expect(log(page).getByText("Here it is.")).toBeVisible();
});

// The block follows its own width: one column in a phone panel, two on a
// tablet, and never a sideways scroll.
for (const size of [
  { name: "tablet", width: 820, height: 1180, columns: 2 },
  { name: "phone", width: 390, height: 844, columns: 1 },
]) {
  test(`${size.name}: plans and the calculator fit the screen`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await stubAnswer(page, [plans, calculator]);
    await openPanel(page);
    await ask(page, "Compare plans");
    const planList = panel(page).locator('[data-block="compare_plans"] > ul');
    await expect(planList.getByText("Team", { exact: true })).toBeVisible();
    const lefts = await planList
      .locator(":scope > li")
      .evaluateAll((items) =>
        items.map((item) => Math.round(item.getBoundingClientRect().x)),
      );
    expect(new Set(lefts).size).toBe(size.columns);
    await expect(
      panel(page)
        .locator('[data-block="calculator"]')
        .getByLabel("Jobs a month"),
    ).toBeVisible();
    // Below 1024 px the panel already is the whole screen.
    await expect(
      panel(page).getByRole("button", { name: "Full screen", exact: true }),
    ).toHaveCount(0);
    await noSidewaysScroll(page);
  });
}

test("the button route answers 404 for a block that is not the caller's", async ({
  request,
}) => {
  const response = await request.post(`${DOCK}/api/bot/ui/action`, {
    headers: { origin: DOCK, "content-type": "application/json" },
    data: {
      blockId: "99999999-9999-4999-8999-999999999999",
      actionId: "refresh",
    },
  });
  expect(response.status()).toBe(404);
  const bad = await request.post(`${DOCK}/api/bot/ui/action`, {
    headers: { origin: DOCK, "content-type": "application/json" },
    data: { blockId: "not-an-id", actionId: "x", tool: "save_job" },
  });
  expect(bad.status()).toBe(400);
});
