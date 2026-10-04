import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AnthropicProvider,
  fromWireResponse,
  LLMProviderError,
  pricesFromEnv,
  toWireMessages,
  toWireRequest,
} from "./anthropic";

describe("Anthropic wire format (7A)", () => {
  it("sends tool results as one user turn after the tool calls", () => {
    const wire = toWireMessages([
      { role: "user", content: "find jobs" },
      {
        role: "assistant",
        content: "",
        toolCalls: [
          { id: "a", name: "search_jobs", input: {} },
          { id: "b", name: "get_job", input: { id: "x" } },
        ],
      },
      { role: "tool", toolCallId: "a", content: "one" },
      { role: "tool", toolCallId: "b", content: "two" },
      { role: "user", content: "[event] confirmed" },
    ]);
    expect(wire).toHaveLength(3);
    expect(wire[1]!.content.map((block) => block.type)).toEqual([
      "tool_use",
      "tool_use",
    ]);
    expect(wire[2]).toEqual({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "a", content: "one" },
        { type: "tool_result", tool_use_id: "b", content: "two" },
        { type: "text", text: "[event] confirmed" },
      ],
    });
  });

  it("describes tools with JSON schema and forces a tool when asked", () => {
    const request = toWireRequest({
      model: "m",
      system: "s",
      messages: [{ role: "user", content: "hi" }],
      tools: [
        {
          name: "record_result",
          description: "d",
          input: z.object({ title: z.string() }),
        },
      ],
      toolChoice: "record_result",
      maxTokens: 100,
    });
    expect(request.tools?.[0]?.input_schema).toMatchObject({
      type: "object",
      properties: { title: { type: "string" } },
    });
    expect(request.tool_choice).toEqual({
      type: "tool",
      name: "record_result",
    });
  });

  it("reads text, tool calls and usage from a response", () => {
    expect(
      fromWireResponse({
        content: [
          { type: "text", text: "Here " },
          { type: "tool_use", id: "t1", name: "get_job", input: { id: "1" } },
          { type: "thinking", thinking: "ignored" },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 12, output_tokens: 3 },
      }),
    ).toEqual({
      text: "Here ",
      toolCalls: [{ id: "t1", name: "get_job", input: { id: "1" } }],
      usage: { tokensIn: 12, tokensOut: 3 },
      stopReason: "tool_use",
    });
    expect(() => fromWireResponse({ nope: true })).toThrow(LLMProviderError);
  });

  it("calls the API with the key header and maps errors", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: [{ type: "text", text: "ok" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      ),
    );
    const provider = new AnthropicProvider("key", fetchMock);
    const request = {
      model: "m",
      system: "s",
      messages: [{ role: "user" as const, content: "hi" }],
      maxTokens: 10,
    };
    await expect(provider.complete(request)).resolves.toMatchObject({
      text: "ok",
      stopReason: "end",
    });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).toMatchObject({
      "x-api-key": "key",
      "anthropic-version": "2023-06-01",
    });
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 529 }));
    await expect(provider.complete(request)).rejects.toMatchObject({
      status: 529,
    });
  });

  it("reads prices from the environment and ignores broken values", () => {
    expect(
      pricesFromEnv({
        LLM_PRICES_MICRO_USD: '{"m":{"in":3000000,"out":15000000}}',
      }),
    ).toEqual({
      m: {
        inputMicroUsdPerMTok: BigInt(3_000_000),
        outputMicroUsdPerMTok: BigInt(15_000_000),
      },
    });
    expect(pricesFromEnv({ LLM_PRICES_MICRO_USD: "not json" })).toEqual({});
    expect(pricesFromEnv({ LLM_PRICES_MICRO_USD: '{"m":{"in":-1}}' })).toEqual(
      {},
    );
    expect(pricesFromEnv({})).toEqual({});
  });
});
