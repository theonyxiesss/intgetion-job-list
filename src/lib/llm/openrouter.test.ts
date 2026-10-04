import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { LLMProviderError } from "./anthropic";
import {
  fromOpenRouterResponse,
  OpenRouterProvider,
  toOpenRouterMessages,
  toOpenRouterRequest,
} from "./openrouter";
import { chat } from "./provider";
import { llmFromEnv, modelsFor, pricesFor } from "./select";

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

  it("keeps Anthropic as the default provider", () => {
    expect(
      llmFromEnv({
        ANTHROPIC_API_KEY: "k",
        LLM_PRICES_MICRO_USD: '{"claude-sonnet-5-5":{"in":1,"out":2}}',
      })?.name,
    ).toBe("anthropic");
  });
});
