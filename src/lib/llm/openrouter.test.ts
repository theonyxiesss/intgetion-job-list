import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LLMProviderError } from "./anthropic";
import {
  freeModelChain,
  fromOpenRouterResponse,
  OPENROUTER_FREE_FALLBACKS,
  OpenRouterProvider,
  toOpenRouterMessages,
  toOpenRouterRequest,
} from "./openrouter";
import { chat } from "./provider";
import {
  llmFromEnv,
  modelsFor,
  OPENROUTER_DEFAULT_MODELS,
  pricesFor,
} from "./select";

describe("OpenRouter wire format (D213)", () => {
  it("puts the system prompt first and pairs tool calls with tool results", () => {
    const wire = toOpenRouterMessages("be brief", [
      { role: "user", content: "find jobs" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "a", name: "search_jobs", input: { q: "rust" } }],
      },
      { role: "tool", toolCallId: "a", content: "[]" },
    ]);
    expect(wire).toEqual([
      { role: "system", content: "be brief" },
      { role: "user", content: "find jobs" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "a",
            type: "function",
            function: { name: "search_jobs", arguments: '{"q":"rust"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "a", content: "[]" },
    ]);
  });

  it("sends tools as functions with a JSON schema and a forced choice", () => {
    const request = toOpenRouterRequest({
      model: "qwen/qwen3.8-27b:free",
      system: "s",
      messages: [{ role: "user", content: "x" }],
      tools: [
        {
          name: "record_result",
          description: "d",
          input: z.object({ skills: z.array(z.string()) }),
        },
      ],
      toolChoice: "record_result",
      maxTokens: 100,
    });
    expect(request.tools?.[0]).toMatchObject({
      type: "function",
      function: { name: "record_result", parameters: { type: "object" } },
    });
    expect(request.tool_choice).toEqual({
      type: "function",
      function: { name: "record_result" },
    });
  });

  it("tries the chosen free model first, then every other free model once (D496, D554)", () => {
    const chain = freeModelChain(OPENROUTER_DEFAULT_MODELS.chat);
    expect(chain[0]).toBe(OPENROUTER_DEFAULT_MODELS.chat);
    expect(chain.slice(1)).toEqual(
      OPENROUTER_FREE_FALLBACKS.filter(
        (m) => m !== OPENROUTER_DEFAULT_MODELS.chat,
      ),
    );
    expect(new Set(chain).size).toBe(chain.length);
    expect(chain.every((m) => m.endsWith(":free"))).toBe(true);
    expect(freeModelChain("openai/gpt-5")).toEqual(["openai/gpt-5"]);
  });

  it("sends one model per request, never the models array", () => {
    const request = toOpenRouterRequest({
      model: OPENROUTER_DEFAULT_MODELS.chat,
      system: "s",
      messages: [{ role: "user", content: "x" }],
      maxTokens: 10,
    });
    expect(request.model).toBe(OPENROUTER_DEFAULT_MODELS.chat);
    expect(request).not.toHaveProperty("models");
  });

  it("moves to the next free model when one is rate limited", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
      const model = JSON.parse(String(init.body)).model as string;
      calls.push(model);
      if (calls.length === 1) return new Response("limited", { status: 429 });
      return Response.json({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      });
    });
    const provider = new OpenRouterProvider(
      "k",
      undefined,
      fetchImpl as typeof fetch,
    );
    const response = await provider.complete({
      model: OPENROUTER_DEFAULT_MODELS.chat,
      system: "s",
      messages: [{ role: "user", content: "x" }],
      maxTokens: 10,
    });
    expect(response.text).toBe("ok");
    expect(response.fallback).toBe(true);
    expect(calls).toEqual([
      OPENROUTER_DEFAULT_MODELS.chat,
      freeModelChain(OPENROUTER_DEFAULT_MODELS.chat)[1],
    ]);
  });

  it("moves on when the answer body times out while it is read", async () => {
    let call = 0;
    const fetchImpl = vi.fn(async () => {
      call += 1;
      if (call === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => {
            throw new DOMException("timeout", "TimeoutError");
          },
        } as unknown as Response;
      }
      return Response.json({
        choices: [{ message: { content: "ok" }, finish_reason: "stop" }],
      });
    });
    const provider = new OpenRouterProvider(
      "k",
      undefined,
      fetchImpl as typeof fetch,
    );
    const response = await provider.complete({
      model: OPENROUTER_DEFAULT_MODELS.chat,
      system: "s",
      messages: [{ role: "user", content: "x" }],
      maxTokens: 10,
    });
    expect(response.text).toBe("ok");
    expect(response.fallback).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("throws the last error when every free model fails", async () => {
    const fetchImpl = vi.fn(
      async () => new Response("limited", { status: 429 }),
    );
    const provider = new OpenRouterProvider(
      "k",
      undefined,
      fetchImpl as typeof fetch,
    );
    await expect(
      provider.complete({
        model: OPENROUTER_DEFAULT_MODELS.chat,
        system: "s",
        messages: [{ role: "user", content: "x" }],
        maxTokens: 10,
      }),
    ).rejects.toBeInstanceOf(LLMProviderError);
    expect(fetchImpl).toHaveBeenCalledTimes(
      freeModelChain(OPENROUTER_DEFAULT_MODELS.chat).length,
    );
  });

  it("reads text, tool calls and usage", () => {
    const response = fromOpenRouterResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              {
                id: "c1",
                function: { name: "get_job", arguments: '{"id":"x"}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 12, completion_tokens: 3 },
    });
    expect(response).toEqual({
      text: "",
      toolCalls: [{ id: "c1", name: "get_job", input: { id: "x" } }],
      usage: { tokensIn: 12, tokensOut: 3 },
      stopReason: "tool_use",
    });
  });

  it("rejects broken tool arguments instead of passing them through", async () => {
    const provider = {
      complete: async () =>
        fromOpenRouterResponse({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    id: "c",
                    function: { name: "get_job", arguments: "{oops" },
                  },
                ],
              },
            },
          ],
        }),
    };
    await expect(
      chat(provider, {
        model: "m",
        system: "s",
        messages: [{ role: "user", content: "x" }],
        tools: [
          {
            name: "get_job",
            description: "d",
            input: z.object({ id: z.string() }),
          },
        ],
        maxTokens: 10,
      }),
    ).rejects.toThrow("Invalid arguments for get_job");
  });

  it("turns an HTTP failure and an error body into LLMProviderError", async () => {
    const failing = new OpenRouterProvider(
      "k",
      undefined,
      vi.fn(async () => new Response("no", { status: 429 })),
    );
    await expect(
      failing.complete({
        model: "m",
        system: "s",
        messages: [],
        maxTokens: 10,
      }),
    ).rejects.toBeInstanceOf(LLMProviderError);
    const errorBody = new OpenRouterProvider(
      "k",
      undefined,
      vi.fn(async () => Response.json({ error: { message: "upstream" } })),
    );
    await expect(
      errorBody.complete({
        model: "m",
        system: "s",
        messages: [],
        maxTokens: 10,
      }),
    ).rejects.toBeInstanceOf(LLMProviderError);
  });

  it("sends the key only in the authorization header", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "hi" } }] }),
    );
    const provider = new OpenRouterProvider(
      "secret-key",
      "https://example.com",
      fetchImpl,
    );
    const response = await provider.complete({
      model: "m",
      system: "s",
      messages: [{ role: "user", content: "x" }],
      maxTokens: 10,
    });
    expect(response.text).toBe("hi");
    const [, init] = fetchImpl.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect((init.headers as Record<string, string>).authorization).toBe(
      "Bearer secret-key",
    );
    expect(String(init.body)).not.toContain("secret-key");
  });
});

describe("provider selection (D213)", () => {
  it("uses OpenRouter free defaults and prices them at zero", () => {
    const env = { LLM_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k" };
    const models = modelsFor("openrouter", env);
    expect(models.chat.endsWith(":free")).toBe(true);
    expect(pricesFor(models, env)[models.chat]).toEqual({
      inputMicroUsdPerMTok: BigInt(0),
      outputMicroUsdPerMTok: BigInt(0),
    });
    expect(llmFromEnv(env)?.name).toBe("openrouter");
  });

  it("is not configured without a key or with a paid model and no price", () => {
    expect(llmFromEnv({ LLM_PROVIDER: "openrouter" })).toBeNull();
    expect(
      llmFromEnv({
        LLM_PROVIDER: "openrouter",
        OPENROUTER_API_KEY: "k",
        LLM_MODEL_CHAT: "anthropic/claude-sonnet-5-5",
      }),
    ).toBeNull();
    expect(llmFromEnv({})).toBeNull();
  });

  it("picks OpenRouter and its free models by default (D317)", () => {
    const setup = llmFromEnv({ OPENROUTER_API_KEY: "k" });
    expect(setup?.name).toBe("openrouter");
    // Free models need no price: the key alone is enough to run the bot.
    expect(setup?.models.chat).toBe(OPENROUTER_DEFAULT_MODELS.chat);
    expect(setup?.models.chat.endsWith(":free")).toBe(true);
    expect(setup?.models.extract.endsWith(":free")).toBe(true);
    expect(setup?.prices[setup.models.chat]?.inputMicroUsdPerMTok).toBe(
      BigInt(0),
    );
  });

  it("switches to Anthropic only when asked, and then wants a price", () => {
    expect(
      llmFromEnv({ LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "k" }),
    ).toBeNull();
    expect(
      llmFromEnv({
        LLM_PROVIDER: "anthropic",
        ANTHROPIC_API_KEY: "k",
        LLM_PRICES_MICRO_USD: '{"claude-sonnet-5-5":{"in":1,"out":2}}',
      })?.name,
    ).toBe("anthropic");
  });
});
