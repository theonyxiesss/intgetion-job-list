import { z } from "zod";
import { LLMProviderError } from "./anthropic";
import type {
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "./provider";

/**
 * OpenRouter adapter (D213): the OpenAI-compatible Chat Completions API over
 * plain `fetch`, so free models (`…:free`) can run the bot. Same contract as
 * the Anthropic adapter; the key stays on the server.
 */

const API_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 45_000;

type WireToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type WireMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export function toOpenRouterMessages(
  system: string,
  messages: readonly LLMMessage[],
): WireMessage[] {
  const out: WireMessage[] = [{ role: "system", content: system }];
  for (const message of messages) {
    if (message.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: message.toolCallId,
        content: message.content,
      });
    } else if (message.role === "assistant") {
      const calls = message.toolCalls ?? [];
      out.push({
        role: "assistant",
        content: message.content || null,
        ...(calls.length
          ? {
              tool_calls: calls.map((call) => ({
                id: call.id,
                type: "function" as const,
                function: {
                  name: call.name,
                  arguments: JSON.stringify(call.input ?? {}),
                },
              })),
            }
          : {}),
      });
    } else {
      out.push({ role: "user", content: message.content });
    }
  }
  return out;
}

export function toOpenRouterRequest(request: LLMRequest) {
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    messages: toOpenRouterMessages(request.system, request.messages),
    ...(request.tools?.length
      ? {
          tools: request.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description,
              parameters: z.toJSONSchema(tool.input, { io: "input" }),
            },
          })),
        }
      : {}),
    ...(request.toolChoice
      ? {
          tool_choice: {
            type: "function",
            function: { name: request.toolChoice },
          },
        }
      : {}),
  };
}

const wireResponse = z.object({
  choices: z
    .array(
      z.object({
        finish_reason: z.string().nullable().optional(),
        message: z.object({
          content: z.string().nullable().optional(),
          tool_calls: z
            .array(
              z.object({
                id: z.string(),
                function: z.object({
                  name: z.string(),
                  arguments: z.string().nullable().optional(),
                }),
              }),
            )
            .nullable()
            .optional(),
        }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().int().min(0),
      completion_tokens: z.number().int().min(0),
    })
    .optional(),
});

function parseArguments(raw: string | null | undefined): unknown {
  if (!raw || !raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    // Left for parseToolCalls: invalid input is an error, not passed through.
    return raw;
  }
}

export function fromOpenRouterResponse(body: unknown): LLMResponse {
  const parsed = wireResponse.safeParse(body);
  if (!parsed.success) {
    throw new LLMProviderError("Unexpected response shape from the provider");
  }
  const choice = parsed.data.choices[0]!;
  const toolCalls = (choice.message.tool_calls ?? []).map((call) => ({
    id: call.id,
    name: call.function.name,
    input: parseArguments(call.function.arguments),
  }));
  const usage = parsed.data.usage;
  return {
    text: choice.message.content ?? "",
    toolCalls,
    usage: {
      tokensIn: usage?.prompt_tokens ?? 0,
      tokensOut: usage?.completion_tokens ?? 0,
    },
    stopReason:
      toolCalls.length > 0 || choice.finish_reason === "tool_calls"
        ? "tool_use"
        : choice.finish_reason === "length"
          ? "max_tokens"
          : "end",
  };
}

export class OpenRouterProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly siteUrl: string | undefined,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(API_URL, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
          // OpenRouter attribution headers (optional, no personal data).
          ...(this.siteUrl ? { "http-referer": this.siteUrl } : {}),
          "x-title": "INTGETION JOB LIST",
        },
        body: JSON.stringify(toOpenRouterRequest(request)),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      throw new LLMProviderError("The provider did not answer");
    }
    if (!response.ok) {
      throw new LLMProviderError(
        `The provider answered ${response.status}`,
        response.status,
      );
    }
    const body = (await response.json()) as { error?: { message?: string } };
    // OpenRouter reports upstream failures as 200 with an `error` object.
    if (body && typeof body === "object" && "error" in body && body.error) {
      throw new LLMProviderError("The provider reported an error");
    }
    return fromOpenRouterResponse(body);
  }
}

/** Free OpenRouter models cost nothing; the per-user message limits still apply. */
export function isFreeModel(model: string): boolean {
  return model.endsWith(":free");
}
