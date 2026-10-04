import { expect, test } from "./fixtures";

const sameOrigin = { origin: "http://127.0.0.1:3000" };

test("7A: a guest chats; without a model the agent says it is unavailable", async ({
  page,
}) => {
  await page.goto("/en/chat");
  await expect(
    page.getByRole("heading", { level: 1, name: "Career agent" }),
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
