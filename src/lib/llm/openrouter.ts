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

/**
 * D496, D554: a free model has a daily and per-minute limit and often one
 * upstream provider, so a failed request moves to the next one here. Only
 * `:free` models that accept tools, from `/api/v1/models` on 2026-10-27
 * (`nemotron-3.5-content-safety` has no tools and is left out). A model that
 * OpenRouter no longer serves is dropped from this list; it was
 * `minimax/minimax-m3.1-flash:free` until 2026-10-27.
 */
export const OPENROUTER_FREE_FALLBACKS = [
  "google/gemma-4-31b-it:free",
  "thinkingmachines/inkling:free",
  "google/gemma-4-26b-a4b-it:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "poolside/laguna-s-2.1:free",
  "cohere/north-mini-code:free",
  "xingchen-agi/xing4.0-29b-a4b:free",
  "dots-studio/dots-3-note-preview:free",
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3.5-lightning:free",
  "thinkingmachines/inkling-small:free",
  "poolside/laguna-xs-2.1:free",
  "recursive/flint-v1.0:free",
  "liquid/lfm-2.5-2.6b:free",
] as const;

/**
 * One attempt per model; no new attempt starts after the chain budget. The
 * 550B default model needed more than 25 s for an answer in a live turn.
 */
const ATTEMPT_TIMEOUT_MS = 40_000;
const CHAIN_BUDGET_MS = 75_000;

/**
 * Hotfix 2026-10-21: every free chat model is a reasoning model, and its
 * hidden reasoning counts against `max_tokens`. With our 800-token answer
 * budget it used it all up and returned neither text nor a tool call. The
 * request asks for short reasoning, and a free model (price zero) gets this
 * much room on top of the answer budget.
 */
export const FREE_REASONING_HEADROOM = 3000;

/** The models to try in order: the chosen one, then the other free models. */
export function freeModelChain(model: string): string[] {
  if (!isFreeModel(model)) return [model];
  return [model, ...OPENROUTER_FREE_FALLBACKS.filter((m) => m !== model)];
}

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
    max_tokens: isFreeModel(request.model)
      ? request.maxTokens + FREE_REASONING_HEADROOM
      : request.maxTokens,
    reasoning: { effort: "low" as const, exclude: true },
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

  /** A free model that fails (limit, outage, unknown) passes the turn on. */
  async complete(request: LLMRequest): Promise<LLMResponse> {
    const chain = freeModelChain(request.model);
    if (chain.length === 1) return this.attempt(request, TIMEOUT_MS);
    const deadline = Date.now() + CHAIN_BUDGET_MS;
    let lastError: LLMProviderError | undefined;
    for (const model of chain) {
      if (lastError && Date.now() > deadline) break;
      try {
        return await this.attempt({ ...request, model }, ATTEMPT_TIMEOUT_MS);
      } catch (error) {
        if (!(error instanceof LLMProviderError)) throw error;
        lastError = error;
      }
    }
    throw lastError ?? new LLMProviderError("The provider did not answer");
  }

  private async attempt(
    request: LLMRequest,
    timeoutMs: number,
  ): Promise<LLMResponse> {
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
        signal: AbortSignal.timeout(timeoutMs),
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
    let body: { error?: { message?: string } };
    try {
      // The timeout also covers reading the body; it must fail like the fetch.
      body = (await response.json()) as typeof body;
    } catch {
      throw new LLMProviderError("The provider did not answer");
    }
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
