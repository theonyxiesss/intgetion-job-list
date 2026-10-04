import { z } from "zod";
import type { PriceTable } from "./budget";
import type {
  LLMMessage,
  LLMProvider,
  LLMRequest,
  LLMResponse,
} from "./provider";

/**
 * Anthropic Messages API adapter over plain `fetch` (D171): no SDK, the key
 * is server-only. Errors throw `LLMProviderError`; the bot turns them into a
 * polite "try later" instead of a stack trace.
 */

const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const TIMEOUT_MS = 30_000;

export class LLMProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LLMProviderError";
  }
}

type ContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

type WireMessage = { role: "user" | "assistant"; content: ContentBlock[] };

/** Tool results go back as one user message right after the tool calls. */
export function toWireMessages(messages: readonly LLMMessage[]): WireMessage[] {
  const out: WireMessage[] = [];
  for (const message of messages) {
    if (message.role === "tool") {
      const block: ContentBlock = {
        type: "tool_result",
        tool_use_id: message.toolCallId,
        content: message.content,
      };
      const last = out.at(-1);
      if (last?.role === "user") {
        last.content.push(block);
      } else {
        out.push({ role: "user", content: [block] });
      }
      continue;
    }
    if (message.role === "assistant") {
      const content: ContentBlock[] = [];
      if (message.content)
        content.push({ type: "text", text: message.content });
      for (const call of message.toolCalls ?? []) {
        content.push({
          type: "tool_use",
          id: call.id,
          name: call.name,
          input: call.input,
        });
      }
      out.push({ role: "assistant", content });
      continue;
    }
    const block: ContentBlock = { type: "text", text: message.content };
    const last = out.at(-1);
    // Consecutive user turns (a tool result, then an event) become one.
    if (last?.role === "user") last.content.push(block);
    else out.push({ role: "user", content: [block] });
  }
  return out;
}

export function toWireRequest(request: LLMRequest) {
  return {
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.system,
    messages: toWireMessages(request.messages),
    ...(request.tools?.length
      ? {
          tools: request.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            input_schema: z.toJSONSchema(tool.input, { io: "input" }),
          })),
        }
      : {}),
    ...(request.toolChoice
      ? { tool_choice: { type: "tool", name: request.toolChoice } }
      : {}),
  };
}

const textBlock = z.object({ type: z.literal("text"), text: z.string() });
const toolUseBlock = z.object({
  type: z.literal("tool_use"),
  id: z.string(),
  name: z.string(),
  input: z.unknown(),
});

const wireResponse = z.object({
  content: z.array(z.object({ type: z.string() }).loose()),
  stop_reason: z.string().nullable(),
  usage: z.object({
    input_tokens: z.number().int().min(0),
    output_tokens: z.number().int().min(0),
  }),
});

export function fromWireResponse(body: unknown): LLMResponse {
  const parsed = wireResponse.safeParse(body);
  if (!parsed.success) {
    throw new LLMProviderError("Unexpected response shape from the provider");
  }
  const { content, stop_reason, usage } = parsed.data;
  let text = "";
  const toolCalls: LLMResponse["toolCalls"] = [];
  for (const block of content) {
    const asText = textBlock.safeParse(block);
    if (asText.success) text += asText.data.text;
    const asTool = toolUseBlock.safeParse(block);
    if (asTool.success) {
      const { id, name, input } = asTool.data;
      toolCalls.push({ id, name, input });
    }
  }
  return {
    text,
    toolCalls,
    usage: { tokensIn: usage.input_tokens, tokensOut: usage.output_tokens },
    stopReason:
      stop_reason === "tool_use"
        ? "tool_use"
        : stop_reason === "max_tokens"
          ? "max_tokens"
          : "end",
  };
}

export class AnthropicProvider implements LLMProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    let response: Response;
    try {
      response = await this.fetchImpl(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(toWireRequest(request)),
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
    return fromWireResponse(await response.json());
  }
}

const priceEntry = z.object({
  in: z.number().int().min(0),
  out: z.number().int().min(0),
});

/**
 * `LLM_PRICES_MICRO_USD`: `{"<model>":{"in":<µ$ per 1M input tokens>,
 * "out":<µ$ per 1M output tokens>}}`. Prices are configuration, not code
 * (D171); a missing or broken value yields an empty table.
 */
export function pricesFromEnv(
  env: Record<string, string | undefined> = process.env,
): PriceTable {
  const raw = env.LLM_PRICES_MICRO_USD?.trim();
  if (!raw) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  const parsed = z.record(z.string(), priceEntry).safeParse(json);
  if (!parsed.success) return {};
  return Object.fromEntries(
    Object.entries(parsed.data).map(([model, price]) => [
      model,
      {
        inputMicroUsdPerMTok: BigInt(price.in),
        outputMicroUsdPerMTok: BigInt(price.out),
      },
    ]),
  );
}
