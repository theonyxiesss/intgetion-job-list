import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FakeLLMProvider,
  MAX_OUTPUT_TOKENS,
  toOpenRouterRequest,
  type LLMResponse,
} from "@/lib/llm";
import type { BotState } from "../service/tools";
import type { BotEvent } from "../service/conversation";

const USER = "00000000-0000-4000-8000-0000000000a1";

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
vi.mock("@/modules/billing/service", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/billing/service")
  >("@/modules/billing/service");
  return {
    ...actual,
    billingMe: () => Promise.resolve({ candidatePlan: "free" }),
  };
});
vi.mock("@/modules/candidates/service", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/candidates/service")
  >("@/modules/candidates/service");
  return { ...actual, getOwnCandidate: () => Promise.resolve(null) };
});
vi.mock("@/modules/users/service", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/users/service")
  >("@/modules/users/service");
  return { ...actual, readSharedProfile: () => Promise.resolve(null) };
});
vi.mock("../service/user-memory", async () => {
  const actual = await vi.importActual<typeof import("../service/user-memory")>(
    "../service/user-memory",
  );
  return { ...actual, listMemory: () => Promise.resolve([]) };
});
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
vi.mock("../repo/bot-repo", () => ({
  takeResumeAck: () => Promise.resolve(undefined),
  takeDraftOfferFlag: () => Promise.resolve(undefined),
  spentSince: () => Promise.resolve(BigInt(0)),
  updateConversation: () => Promise.resolve(),
  userDailyCosts: () => Promise.resolve([]),
  insertAction: () => Promise.resolve(),
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

const { TOOLS, toolsFor } = await import("../service/tools");
const { routeDomains } = await import("../service/routing");
const { LOADABLE_DOMAINS, domainOf } = await import("../service/tool-domains");
const { systemPrompt } = await import("../prompts/system");
const { handleMessage, setBotLLMForTests } =
  await import("../service/conversation");

const prices = {
  "fake-model": {
    inputMicroUsdPerMTok: BigInt(1),
    outputMicroUsdPerMTok: BigInt(1),
  },
};

/** Characters of the real request body for this tool set. */
function requestChars(tools: ReturnType<typeof toolsFor>, signedIn = true) {
  const body = toOpenRouterRequest({
    model: "x/y:free",
    system: systemPrompt({ locale: "ru", signedIn }),
    messages: [{ role: "user", content: "x" }],
    tools,
    maxTokens: MAX_OUTPUT_TOKENS,
  });
  return {
    tools: JSON.stringify(body.tools ?? []).length,
    body: JSON.stringify(body).length,
  };
}

function routed(text: string, state: BotState = {}, previous?: string[]) {
  const domains = routeDomains({
    text,
    topic: state.topic,
    previous,
  });
  return { domains, tools: toolsFor(USER, state, domains) };
}

/** Recorded eval cases: the last message and the tools the reply called. */
function evalCases() {
  const root = path.resolve(process.cwd(), "evals");
  const cases: { id: string; text: string; tools: string[] }[] = [];
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of readdirSync(path.join(root, dir.name))) {
      if (!file.endsWith(".json")) continue;
      const data = JSON.parse(
        readFileSync(path.join(root, dir.name, file), "utf8"),
      ) as {
        id: string;
        turns: { user: string }[];
        reply?: { toolCalls?: { name: string }[] };
      };
      const tools = (data.reply?.toolCalls ?? []).map((call) => call.name);
      if (tools.length)
        cases.push({ id: data.id, text: data.turns.at(-1)!.user, tools });
    }
  }
  return cases;
}

/** Cross-service and everyday requests the founder named (D522). */
const SCENARIOS: {
  text: string;
  topic?: BotState["topic"];
  tools: string[];
}[] = [
  {
    text: "Найди монтажёра для рекламных роликов, помоги создать заказ и проверь мой тариф",
    tools: ["find_services", "send_service_request", "get_my_standing"],
  },
  {
    text: "Хочу найти человека для монтажа рекламных роликов",
    tools: ["find_services"],
  },
  {
    text: "а ты можешь выставить вакансию",
    topic: "ugc",
    tools: ["offer_step"],
  },
  {
    text: "Покажи мои вакансии и закрой старую",
    tools: ["get_my_jobs", "set_job_status"],
  },
  {
    text: "Отзови мой отклик на Backend engineer",
    tools: ["get_my_applications", "withdraw_application"],
  },
  { text: "Напомни завтра в 10 о собеседовании", tools: ["create_reminder"] },
  { text: "Какие митапы по Web3 в Берлине в ноябре?", tools: ["find_events"] },
  { text: "Смени язык писем на английский", tools: ["set_email_language"] },
  { text: "Как идут мои брифы?", tools: ["get_ugc_summary"] },
  {
    text: "Хочу стать креатором и снимать ролики",
    tools: ["propose_creator_profile"],
  },
  {
    text: "I need someone to build a landing page on Next.js",
    tools: ["find_services"],
  },
  {
    text: "Find me remote React jobs and save the search",
    tools: ["search_jobs", "save_search"],
  },
  { text: "How are my UGC briefs going?", tools: ["get_ugc_summary"] },
  { text: "Hide my profile from employers", tools: ["set_profile_hidden"] },
  {
    text: "Remember that I want to move to Lisbon next year",
    tools: ["remember_fact"],
  },
  { text: "What's in my account?", tools: ["get_my_cards"] },
  { text: "Хочу оплатить Pro", tools: ["offer_step"] },
  { text: "Измени описание моей компании", tools: ["propose_company_update"] },
  {
    text: "Прими заказ от покупателя",
    tools: ["get_my_orders", "respond_to_request"],
  },
  { text: "Я переехал в Польшу", tools: ["propose_account_update"] },
];

describe("hybrid tool routing (D522)", () => {
  beforeEach(() => {
    messages.length = 0;
    runToolMock.mockReset();
    vi.unstubAllEnvs();
  });

  it("gives every registry tool a service", () => {
    for (const tool of TOOLS)
      expect(domainOf(tool.name), tool.name).toBeTruthy();
  });

  it("offers the needed tools for recorded and cross-service requests, smaller than the full set", () => {
    const full = toolsFor(USER);
    const fullSize = requestChars(full);
    const rows: string[] = [];
    let direct = 0;
    let withLoad = 0;
    let total = 0;
    let toolCount = 0;
    let toolChars = 0;
    let bodyChars = 0;
    const all = [
      ...evalCases().map((c) => ({ ...c, topic: undefined })),
      ...SCENARIOS.map((s, i) => ({ id: `scenario-${i + 1}`, ...s })),
    ];
    for (const item of all) {
      const state: BotState = item.topic ? { topic: item.topic } : {};
      const { domains, tools } = routed(item.text, state);
      const offered = new Set(tools.map((t) => t.name));
      const allowed = new Set(
        toolsFor(USER, state, LOADABLE_DOMAINS).map((t) => t.name),
      );
      const needed = item.tools.filter((name) => allowed.has(name));
      const missing = needed.filter((name) => !offered.has(name));
      total += 1;
      if (missing.length === 0) direct += 1;
      // One `use_tools` load brings any missing service.
      const loadable = missing.every((name) =>
        (LOADABLE_DOMAINS as readonly string[]).includes(domainOf(name) ?? ""),
      );
      if (loadable) withLoad += 1;
      const size = requestChars(tools);
      toolCount += tools.length;
      toolChars += size.tools;
      bodyChars += size.body;
      rows.push(
        `${item.id}\t${domains.join("+")}\t${tools.length}\t${size.tools}\t${missing.join(",") || "-"}`,
      );
    }
    const report = [
      `full set: ${full.length} tools, ${fullSize.tools} tool chars, ${fullSize.body} body chars`,
      `routed avg: ${(toolCount / total).toFixed(1)} tools, ${Math.round(toolChars / total)} tool chars, ${Math.round(bodyChars / total)} body chars`,
      `needed tool offered directly: ${direct}/${total}; after one use_tools load: ${withLoad}/${total}`,
      "case\tdomains\ttools\ttoolChars\tmissing",
      ...rows,
    ].join("\n");
    if (process.env.ROUTING_REPORT)
      writeFileSync(process.env.ROUTING_REPORT, report);
    expect(withLoad).toBe(total);
    expect(direct / total).toBeGreaterThanOrEqual(0.9);
    expect(toolChars / total).toBeLessThan(fullSize.tools * 0.5);
  });

  it("keeps the services of the last turn for a bare yes, and the topic", () => {
    expect(routeDomains({ text: "да", previous: ["ugc"] })).toEqual(["ugc"]);
    expect(routeDomains({ text: "ок" })).toEqual(["jobs"]);
    expect(routeDomains({ text: "выставить вакансию", topic: "ugc" })).toEqual([
      "jobs",
      "employer",
      "ugc",
    ]);
  });

  it("leaves guests, drafts and the switched-off router as they were", () => {
    expect(toolsFor(null).map((t) => t.name)).not.toContain("use_tools");
    expect(toolsFor(USER).map((t) => t.name)).not.toContain("use_tools");
    expect(
      toolsFor(USER, { jobDraftMode: true }, ["jobs"]).map((t) => t.name),
    ).toEqual(["patch_job_draft", "confirm_job_draft", "reset_job_draft"]);
  });

  async function turn(script: LLMResponse[], state: BotState = {}) {
    const provider = new FakeLLMProvider(script);
    setBotLLMForTests({ provider, model: "fake-model", prices });
    const events: BotEvent[] = [];
    await handleMessage(
      {
        userId: USER,
        conversation: {
          id: "c-routing",
          userId: USER,
          channel: "web",
          sessionTokenHash: "hash",
          jobId: null,
          campaignId: null,
          inviteId: null,
          locale: "ru",
          state,
          summary: null,
          linkedAt: null,
          createdAt: new Date(),
          lastMessageAt: new Date(),
        },
        text: "Проверь мой профиль",
        ip: "203.0.113.9",
        locale: "ru",
      },
      (event) => events.push(event),
    );
    return provider.requests
      .filter((request) => request.toolChoice !== "record_result")
      .map((request) => (request.tools ?? []).map((t) => t.name));
  }

  function call(name: string, input: unknown): LLMResponse {
    return {
      text: "",
      toolCalls: [{ id: `call_${name}`, name, input }],
      usage: { tokensIn: 1, tokensOut: 1 },
      stopReason: "tool_use",
    };
  }
  const said = (text: string): LLMResponse => ({
    text,
    toolCalls: [],
    usage: { tokensIn: 1, tokensOut: 1 },
    stopReason: "end",
  });

  it("loads another service with use_tools in the same reply, without using up a round", async () => {
    runToolMock.mockResolvedValue({ llm: "[]" });
    const offered = await turn([
      call("use_tools", { domains: ["freelance"] }),
      call("find_services", { q: "video editing" }),
      call("get_my_standing", {}),
      said("Нашёл двух монтажёров."),
    ]);
    expect(offered[0]).not.toContain("find_services");
    expect(offered[1]).toContain("find_services");
    expect(offered).toHaveLength(4);
    expect(runToolMock.mock.calls.map((c) => c[1])).toEqual([
      "find_services",
      "get_my_standing",
    ]);
  });

  it("loads just the service of a tool the model reached for, not the whole registry", async () => {
    runToolMock.mockResolvedValue({ llm: "[]" });
    const offered = await turn([
      call("find_services", { q: "logo" }),
      call("find_services", { q: "logo" }),
      said("Вот услуги."),
    ]);
    expect(offered[0]).not.toContain("find_services");
    expect(offered[1]).toContain("find_services");
    expect(offered[1]!.length).toBeLessThan(toolsFor(USER).length);
    expect(runToolMock).toHaveBeenCalledTimes(1);
  });

  it("allows one load per reply, and records what was offered", async () => {
    runToolMock.mockResolvedValue({ llm: "[]" });
    await turn([
      call("use_tools", { domains: ["freelance"] }),
      call("use_tools", { domains: ["events"] }),
      said("Готово."),
    ]);
    const loaded = messages.filter(
      (row) => row.role === "tool" && /are loaded/.test(row.content),
    );
    expect(loaded).toHaveLength(1);
    const round = messages.find(
      (row) =>
        row.role === "assistant" &&
        (row.toolCall as { routing?: unknown } | null)?.routing,
    );
    expect(
      (round!.toolCall as { routing: { domains: string[]; tools: number } })
        .routing.tools,
    ).toBeGreaterThan(0);
  });

  it("offers the full set again when SPOKI_TOOL_ROUTING=false", async () => {
    vi.stubEnv("SPOKI_TOOL_ROUTING", "false");
    const offered = await turn([said("Ок.")]);
    expect(offered[0]).toHaveLength(toolsFor(USER).length);
    expect(offered[0]).not.toContain("use_tools");
  });
});
