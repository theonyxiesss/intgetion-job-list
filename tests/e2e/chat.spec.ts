import { createServer } from "node:http";
import { expect, test } from "./fixtures";

const sameOrigin = { origin: "http://127.0.0.1:3000" };

test("Spoki shows the live tool and the finished work timeline", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  let receivedPost = false;
  const mock = createServer(async (request, response) => {
    const origin = request.headers.origin ?? "http://127.0.0.1:3000";
    response.setHeader("access-control-allow-origin", origin);
    response.setHeader("access-control-allow-credentials", "true");
    response.setHeader("access-control-allow-methods", "POST, OPTIONS");
    response.setHeader(
      "access-control-allow-headers",
      request.headers["access-control-request-headers"] ?? "content-type",
    );
    if (request.method === "OPTIONS") {
      response.writeHead(204).end();
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(404).end();
      return;
    }

    receivedPost = true;
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.flushHeaders();
    response.write(
      'event: tool_start\ndata: {"type":"tool_start","id":"lookup-1","name":"search_jobs"}\n\n',
    );
    await new Promise((resolve) => setTimeout(resolve, 1800));
    response.write(
      'event: tool_end\ndata: {"type":"tool_end","id":"lookup-1","status":"completed","ms":1400,"summary":{"kind":"jobs","count":5,"remote":true}}\n\n' +
        'event: token\ndata: {"type":"token","text":"Нашёл пять удалённых вакансий."}\n\n' +
        'event: done\ndata: {"type":"done","conversationId":"00000000-0000-4000-8000-000000000000"}\n\n',
    );
    response.end();
  });
  await new Promise<void>((resolve) => mock.listen(0, "127.0.0.1", resolve));
  const address = mock.address();
  if (!address || typeof address === "string")
    throw new Error("Could not start the local mock SSE server");

  try {
    await page.route("**/api/bot/conversation**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ messages: [], pending: [] }),
      }),
    );
    await page.route("**/api/bot/message", (route) =>
      route.continue({ url: `http://127.0.0.1:${address.port}/message` }),
    );
    await page.goto("/ru/chat");

    await expect(
      page.getByText(/Spoki может ошибаться|@intgetion_bot/),
    ).toHaveCount(0);
    const field = page.getByLabel("Напишите сообщение");
    await field.fill("Найди удалённые вакансии");
    await field.press("Enter");

    const progress = page.locator("[data-work-progress]");
    // Open while Spoki works, with a live clock (D588).
    await expect(progress).toHaveAttribute("open", "");
    await expect(progress.locator("summary")).toContainText("Думаю");
    await expect(page.locator("[data-thinking]")).toContainText(
      "Searching jobs",
    );
    await expect(page.locator("[data-thinking]")).toHaveAttribute(
      "aria-busy",
      "true",
    );

    // Folded once done, with the time it took.
    await expect(progress.locator("summary")).toContainText("Подумал за");
    await expect(progress).not.toHaveAttribute("open", "");
    await progress.locator("summary").click();
    await expect(progress.getByText("Поиск вакансий")).toBeVisible();
    await expect(progress.getByText("удалённо → 5 вакансий")).toBeVisible();
    expect(receivedPost).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      mock.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("7A: a guest chats; without a model the agent says it is unavailable", async ({
  page,
}) => {
  await page.goto("/en/chat");
  await expect(
    page.getByRole("heading", { level: 1, name: "Spoki Assistant" }),
  ).toBeVisible();
  await page
    .getByLabel("Write a message")
    .fill("Remote backend jobs, mail me a@example.com");
  await page.getByRole("button", { name: "Send" }).click();
  const log = page.getByRole("log", { name: "Conversation" });
  await expect(log.getByText("Remote backend jobs")).toBeVisible();
  await expect(log.getByText(/not available right now/)).toBeVisible();

  // The history comes back for the same session, with the email redacted.
  const history = await page.request.get("/api/bot/conversation");
  const body = (await history.json()) as {
    messages: { role: string; content: string }[];
  };
  expect(body.messages.at(-1)).toMatchObject({ role: "user" });
  expect(body.messages.at(-1)?.content).toContain("[email]");
  expect(body.messages.at(-1)?.content).not.toContain("a@example.com");
});

test("chat composer grows a few lines, then scrolls inside", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/en/chat");
    const field = page.getByLabel("Write a message");
    // On a phone, writing hides the header and the tab bar (D431, D468);
    // the size is compared from that moment on.
    await field.focus();
    const shellBefore = await page.locator(".chat-shell").boundingBox();
    const heightOf = async (value: string) => {
      await field.fill(value);
      return Math.round((await field.boundingBox())?.height ?? 0);
    };
    const one = await heightOf("one line");
    const two = await heightOf("one\ntwo");
    const three = await heightOf("one\ntwo\nthree");
    const capped = await heightOf(`${"line\n".repeat(40)}`);
    expect(one).toBeLessThanOrEqual(48);
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
    expect(capped).toBeGreaterThan(three);
    expect(capped).toBeLessThanOrEqual(160);
    expect(
      await field.evaluate((node) => node.scrollHeight > node.clientHeight + 1),
    ).toBe(true);
    expect(
      await field.evaluate((node) => getComputedStyle(node).overflowY),
    ).toBe("auto");
    const shell = await page.locator(".chat-shell").boundingBox();
    expect(Math.round(shell?.height ?? 0)).toBe(
      Math.round(shellBefore?.height ?? 0),
    );
    const log = await page
      .getByRole("log", { name: "Conversation" })
      .boundingBox();
    expect(log?.height ?? 0).toBeGreaterThan(capped);
  }
});

// D491: a long thread scrolls inside the conversation; the field stays on
// screen. The layout wrappers of the left rail once grew with the thread.
test("a long conversation scrolls inside and keeps the field in view", async ({
  page,
}) => {
  const viewport = { width: 1280, height: 800 };
  await page.setViewportSize(viewport);
  await page.goto("/en/chat");
  const log = page.getByRole("log", { name: "Conversation" });
  await log.evaluate((node) => {
    const tall = document.createElement("div");
    tall.style.height = "3000px";
    (node.firstElementChild ?? node).appendChild(tall);
  });
  const field = page.getByLabel("Write a message");
  const box = await field.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
    viewport.height,
  );
  expect(
    await log.evaluate((node) => node.scrollHeight > node.clientHeight + 1),
  ).toBe(true);
  await field.fill("still typing");
  await expect(field).toHaveValue("still typing");
});

test("7A: guests cannot confirm actions (P11)", async ({ request }) => {
  const response = await request.post("/api/bot/confirm", {
    headers: sameOrigin,
    data: {
      confirmationId: "00000000-0000-4000-8000-000000000000",
      accept: true,
    },
  });
  expect(response.status()).toBe(401);
});

// D313: Telegram sends the webhook with no Origin; the CSRF rule must not eat
// it, or the bot is silently dead. A wrong secret is still refused.
test("the Telegram webhook is reachable without an Origin header", async ({
  request,
}) => {
  const response = await request.post("/api/telegram/webhook", {
    headers: { "x-telegram-bot-api-secret-token": "wrong" },
    data: {},
  });
  expect(response.status()).not.toBe(403);
  // 404 when no bot token is configured for the run, 401 when the secret fails.
  expect([401, 404]).toContain(response.status());
  const other = await request.post("/api/bot/message", { data: { text: "x" } });
  expect(other.status()).toBe(403);
});
