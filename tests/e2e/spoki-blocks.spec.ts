import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Page, Route } from "@playwright/test";
import { consentCookie, expect, test, testIp } from "./fixtures";
import { authLink, waitForMail } from "./mail";

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
  const width = page.viewportSize()?.width ?? 1600;
  if (width >= 1024) {
    // At desktop width Spoki is already part of the page layout (D531).
    await expect(field(page)).toBeVisible();
    return;
  }
  // A phone opens Spoki from the tab bar; narrower desktop uses the header.
  await (
    width < 768
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

  // Choosing Spoki leaves the calculator beside the current page.
  await page.locator('[data-rail] a[href="/chat"]').click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(slider).toHaveValue("5");
  // The direct full-screen address remains available from the footer.
  await page.locator('footer a[href="/chat"]').click();
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

test("a reload restores saved cards; opening a job keeps Spoki beside the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
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

  await cards.getByRole("link", { name: "Solidity Engineer" }).click();
  await expect(page).toHaveURL(new RegExp(`/jobs/${JOB}$`));
  await expect(panel(page)).toHaveAttribute("data-spoki-mode", "docked");
  await expect(field(page)).toBeVisible();
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

/**
 * The whole path under a real account, on the isolated CI database: the
 * kept block draws in the panel, "Save" writes the saved job and the
 * action journal (D521), a reload keeps it, full screen keeps it; a
 * confirmation card waits in the panel and in full screen. Nothing here
 * reaches the cloud database: CI runs `supabase start`.
 */
test("signed in: Save writes the saved job and the journal; a card works in the panel and full screen", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");
  await page.setViewportSize({ width: 1600, height: 900 });

  // A real account through the local mail catcher.
  const email = `blocks-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
  await page.goto("/en/register");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.locator('input[type="password"]').fill("orbit-lantern-42");
  await page.getByLabel("I accept the terms").check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/:\d+\/auth\/check-email$/);
  await page.goto(authLink(await waitForMail(page.request, email)));
  await expect(page).toHaveURL(/:\d+\/auth\/(confirmed|signed-in)/);
  const me = await page.request.get("/api/me");
  expect(me.status()).toBe(200);
  const userId = ((await me.json()) as { id: string }).id;

  // A published job, a thread with its block, a waiting card.
  const companyId = randomUUID();
  const jobId = randomUUID();
  const conversationId = randomUUID();
  const confirmationId = randomUUID();
  const title = `Blocks e2e ${jobId.slice(0, 8)}`;
  const block = {
    ...jobCards(1),
    id: randomUUID(),
    props: {
      items: [
        {
          id: jobId,
          title,
          company: "Blocks Co",
          actions: [`open:${jobId}`, `save:${jobId}`],
        },
      ],
    },
    actions: [
      {
        id: `open:${jobId}`,
        type: "link",
        label: "Open",
        path: `/jobs/${jobId}`,
      },
      {
        id: `save:${jobId}`,
        type: "action",
        label: "Save",
        doneLabel: "Saved",
        tool: "save_job",
        args: { jobId },
        write: true,
      },
      { id: "refresh", type: "refresh", label: "Refresh" },
    ],
  };
  const db = new pg.Client({ connectionString });
  await db.connect();
  try {
    await db.query(
      `insert into public.companies (id, name, slug, status) values ($1, 'Blocks Co', $2, 'verified')`,
      [companyId, `blocks-${companyId.slice(0, 8)}`],
    );
    await db.query(
      `insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
       values ($1, $2, $3, 'Blocks e2e role description long enough for the schema constraints of a job.', 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')`,
      [jobId, companyId, title],
    );
    await db.query(
      `insert into public.bot_conversations (id, user_id, session_token_hash, locale, last_message_at)
       values ($1, $2, $3, 'en', now())`,
      [conversationId, userId, `blocks-${conversationId}`],
    );
    await db.query(
      `insert into public.bot_messages (conversation_id, role, content, created_at) values ($1, 'user', 'Find remote roles', now() - interval '2 seconds')`,
      [conversationId],
    );
    await db.query(
      `insert into public.bot_messages (conversation_id, role, content, tool_call, created_at)
       values ($1, 'tool', 'one job', $2::jsonb, now() - interval '1 second')`,
      [
        conversationId,
        JSON.stringify({
          toolCallId: "call_e2e",
          name: "search_jobs",
          ui: block,
        }),
      ],
    );
    await db.query(
      `insert into public.bot_confirmations (id, conversation_id, user_id, tool, args, args_hash, expires_at)
       values ($1, $2, $3, 'apply_to_job', $4::jsonb, 'e2e', now() + interval '10 minutes')`,
      [confirmationId, conversationId, userId, JSON.stringify({ jobId })],
    );
  } finally {
    await db.end();
  }

  // Signed in, the panel is open from the start (D525).
  await page.goto("/en/jobs");
  await expect(field(page)).toBeVisible();
  const cards = panel(page).locator('[data-block="job_cards"]');
  await expect(cards.getByRole("link", { name: title })).toBeVisible();
  await cards.getByRole("button", { name: "Save", exact: true }).click();
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();

  const check = new pg.Client({ connectionString });
  await check.connect();
  try {
    const saved = await check.query(
      `select count(*)::int as n from public.saved_jobs where user_id = $1 and job_id = $2`,
      [userId, jobId],
    );
    expect(saved.rows[0]?.n).toBe(1);
    const journal = await check.query(
      `select tool, kind, status, channel from public.bot_actions where user_id = $1`,
      [userId],
    );
    expect(journal.rows).toContainEqual({
      tool: "save_job",
      kind: "direct",
      status: "completed",
      channel: "web",
    });
  } finally {
    await check.end();
  }

  // The card waits in the panel, and in full screen it is the same card.
  const card = panel(page).getByText("Apply to this job?");
  await expect(card).toBeVisible();
  await page.locator('footer a[href="/chat"]').click();
  await expect(page).toHaveURL(/\/chat$/);
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(card).toBeVisible();
  await panel(page).getByRole("button", { name: "Cancel" }).click();
  await expect(panel(page).getByText("Cancelled.")).toBeVisible();

  // After a reload the saved button stays saved and the card is gone.
  await page.reload();
  await expect(cards.getByRole("button", { name: "Saved" })).toBeDisabled();
  await expect(panel(page).getByText("Apply to this job?")).toHaveCount(0);
});
