import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeLLMProvider, fakeText, fakeToolCall } from "@/lib/llm";
import { setVacancyReaderForTests } from "../service/fit";
import type { BotEvent } from "../service/conversation";

/** D523: a data tool's cards become a block, kept with the tool row. */

const runToolMock = vi.hoisted(() => vi.fn());
const messages = vi.hoisted(
  () =>
    [] as Array<{
      id: string;
      role: string;
      content: string;
      toolCall: unknown;
      createdAt: Date;
    }>,
);

vi.mock("@/lib/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/rate-limit")>(
      "@/lib/rate-limit",
    );
  return { ...actual, enforceRateLimit: () => Promise.resolve() };
});

vi.mock("../repo/bot-repo", () => ({
  takeResumeAck: () => Promise.resolve(undefined),
  takeDraftOfferFlag: () => Promise.resolve(undefined),
  spentSince: () => Promise.resolve(BigInt(0)),
  updateConversation: () => Promise.resolve(),
  userDailyCosts: () => Promise.resolve([]),
  insertMessage: (input: {
    role: string;
    content: string;
    toolCall?: unknown;
  }) => {
    const row = {
      id: `m${messages.length + 1}`,
      role: input.role,
      content: input.content,
      toolCall: input.toolCall ?? null,
      createdAt: new Date(),
    };
    messages.push(row);
    return Promise.resolve(row);
  },
  listMessages: () => Promise.resolve(messages.map((row) => ({ ...row }))),
}));

vi.mock("../service/tools", async () => {
  const actual =
    await vi.importActual<typeof import("../service/tools")>(
      "../service/tools",
    );
  return {
    ...actual,
    runTool: (...args: unknown[]) => runToolMock(...args),
  };
});

const { conversationHistory, handleMessage, setBotLLMForTests } =
  await import("../service/conversation");

const JOB = "11111111-1111-4111-8111-111111111111";
const prices = {
  "fake-model": {
    inputMicroUsdPerMTok: BigInt(1),
    outputMicroUsdPerMTok: BigInt(1),
  },
};

const conversation = {
  id: "c1",
  userId: null,
  channel: "web",
  sessionTokenHash: "hash",
  jobId: null,
  campaignId: null,
  inviteId: null,
  locale: "en",
  state: {
    draft: {
      country: "IT",
      desiredTitles: ["solidity engineer"],
      workFormats: ["remote"],
    },
  },
  summary: null,
  linkedAt: null,
  createdAt: new Date(),
  lastMessageAt: new Date(),
};

async function turn(channel?: "web" | "telegram") {
  const events: BotEvent[] = [];
  await handleMessage(
    {
      userId: null,
      conversation,
      text: "show solidity jobs",
      ip: "203.0.113.20",
      locale: "en",
      ...(channel ? { channel } : {}),
    },
    (event) => events.push(event),
  );
  return events;
}

describe("Spoki blocks in the chat (D523)", () => {
  beforeEach(() => {
    messages.length = 0;
    setVacancyReaderForTests(async () => null);
    runToolMock.mockReset();
    runToolMock.mockResolvedValue({
      llm: "one job",
      client: {
        kind: "jobs",
        data: [{ id: JOB, title: "Solidity Engineer", companyName: "Acme" }],
      },
    });
    setBotLLMForTests({
      provider: new FakeLLMProvider([
        fakeToolCall("search_jobs", { q: "solidity" }),
        fakeText("One role."),
      ]),
      model: "fake-model",
      prices,
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps the old cards while the flag is off", async () => {
    vi.stubEnv("SPOKI_INTERACTIVE_UI", "false");
    const events = await turn();
    expect(events.some((event) => event.type === "ui")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool_result", kind: "jobs" }),
    );
    const tool = messages.find((row) => row.role === "tool");
    expect(tool?.toolCall).not.toHaveProperty("ui");
  });

  it("sends a checked block instead of the cards and keeps it for the history", async () => {
    vi.stubEnv("SPOKI_INTERACTIVE_UI", "true");
    const events = await turn();
    const ui = events.find(
      (event): event is Extract<BotEvent, { type: "ui" }> =>
        event.type === "ui",
    );
    expect(ui?.block.component).toBe("job_cards");
    expect(
      events.some(
        (event) => event.type === "tool_result" && event.kind === "jobs",
      ),
    ).toBe(false);
    // The model reads only the tool text; the block waits with the row.
    const tool = messages.find((row) => row.role === "tool");
    expect(tool?.content).toBe("one job");
    expect((tool?.toolCall as { ui?: { id: string } }).ui?.id).toBe(
      ui?.block.id,
    );

    const history = await conversationHistory("c1");
    const shown = history.find((row) => row.role === "ui");
    expect(shown).toMatchObject({
      role: "ui",
      block: { id: ui?.block.id, component: "job_cards" },
      done: [],
    });
    expect(shown?.content).toContain("Solidity Engineer — Acme");
    // Old messages are where they were.
    expect(history.map((row) => row.role).slice(0, 3)).toEqual([
      "user",
      "ui",
      "assistant",
    ]);
  });

  it("keeps the Telegram cards: no block from a data tool there", async () => {
    vi.stubEnv("SPOKI_INTERACTIVE_UI", "true");
    const events = await turn("telegram");
    expect(events.some((event) => event.type === "ui")).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({ type: "tool_result", kind: "jobs" }),
    );
  });

  it("draws nothing from a kept block that fails the check", async () => {
    messages.push({
      id: "bad",
      role: "tool",
      content: "x",
      toolCall: {
        toolCallId: "t",
        name: "search_jobs",
        ui: { v: 1, html: "<b>" },
      },
      createdAt: new Date(),
    });
    const history = await conversationHistory("c1");
    expect(history.find((row) => row.id === "bad")).toBeUndefined();
  });
});
