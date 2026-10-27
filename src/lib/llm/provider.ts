import type { z } from "zod";
import { MAX_OUTPUT_TOKENS } from "./budget";

/**
 * Provider-neutral LLM contract (D29). The bot core talks to this interface
 * only; the Anthropic adapter arrives with 7A. No network code lives here.
 */

export type LLMMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LLMToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

export type LLMToolDefinition = {
  name: string;
  description: string;
  /** Arguments are validated against this schema before any tool runs. */
  input: z.ZodType;
};

export type LLMToolCall = { id: string; name: string; input: unknown };

export type LLMUsage = { tokensIn: number; tokensOut: number };

export type LLMRequest = {
  model: string;
  system: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  /** Forces a call of this tool (structured output). */
  toolChoice?: string;
  maxTokens: number;
};

export type LLMResponse = {
  text: string;
  toolCalls: LLMToolCall[];
  usage: LLMUsage;
  stopReason: "end" | "tool_use" | "max_tokens";
};

export interface LLMProvider {
  complete(request: LLMRequest): Promise<LLMResponse>;
}

export class LLMOutputError extends Error {
  constructor(
    message: string,
    readonly issues?: unknown,
  ) {
    super(message);
    this.name = "LLMOutputError";
  }
}

export type LLMModels = { chat: string; extract: string };

/** D29 defaults; `LLM_MODEL_CHAT` / `LLM_MODEL_EXTRACT` override them. */
export function modelsFromEnv(
  env: Record<string, string | undefined> = process.env,
): LLMModels {
  return {
    chat: env.LLM_MODEL_CHAT?.trim() || "claude-sonnet-5-5",
    extract: env.LLM_MODEL_EXTRACT?.trim() || "claude-haiku-4-5-20251001",
  };
}

function assertRequest(request: LLMRequest) {
  if (
    !Number.isInteger(request.maxTokens) ||
    request.maxTokens < 1 ||
    request.maxTokens > MAX_OUTPUT_TOKENS
  ) {
    throw new RangeError(
      `maxTokens must be 1..${MAX_OUTPUT_TOKENS} (12.5), got ${request.maxTokens}`,
    );
  }
}

/**
 * Validates every tool call against its tool's schema. An unknown tool or
 * invalid arguments is an error, never passed through "as is".
 */
export function parseToolCalls(
  calls: readonly LLMToolCall[],
  tools: readonly LLMToolDefinition[],
): { id: string; name: string; input: unknown }[] {
  return calls.map((call) => {
    const tool = tools.find((candidate) => candidate.name === call.name);
    if (!tool) throw new LLMOutputError(`Unknown tool ${call.name}`);
    let parsed = tool.input.safeParse(call.input);
    if (!parsed.success) {
      const normalized = decodeJsonObjectArguments(
        call.input,
        parsed.error.issues,
      );
      if (normalized !== call.input) parsed = tool.input.safeParse(normalized);
    }
    if (!parsed.success) {
      throw new LLMOutputError(
        `Invalid arguments for ${call.name}`,
        parsed.error.issues,
      );
    }
    return { id: call.id, name: call.name, input: parsed.data };
  });
}

/** Repair only fields the schema expected to be objects or arrays. */
function decodeJsonObjectArguments(
  input: unknown,
  issues: readonly z.core.$ZodIssue[],
): unknown {
  let result = input;
  for (const issue of issues) {
    if (
      issue.code !== "invalid_type" ||
      (issue.expected !== "object" && issue.expected !== "array") ||
      issue.path.some(
        (key) =>
          typeof key === "symbol" ||
          key === "__proto__" ||
          key === "constructor" ||
          key === "prototype",
      )
    ) {
      continue;
    }
    let current: unknown = result;
    for (const key of issue.path) {
      if (current === null || typeof current !== "object") break;
      current = (current as Record<string | number, unknown>)[
        key as string | number
      ];
    }
    if (typeof current !== "string" || current.length > 16_384) continue;
    const trimmed = current.trim();
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) continue;
    let decoded: unknown;
    try {
      decoded = JSON.parse(trimmed);
    } catch {
      continue;
    }
    if (
      issue.expected === "array"
        ? !Array.isArray(decoded)
        : decoded === null ||
          typeof decoded !== "object" ||
          Array.isArray(decoded)
    ) {
      continue;
    }
    const replace = (value: unknown, path: readonly PropertyKey[]): unknown => {
      if (path.length === 0) return decoded;
      if (value === null || typeof value !== "object") return value;
      const [key, ...rest] = path;
      if (typeof key !== "string" && typeof key !== "number") return value;
      if (Array.isArray(value)) {
        const copy = [...value];
        copy[key as number] = replace(copy[key as number], rest);
        return copy;
      }
      const object = value as Record<string | number, unknown>;
      return { ...object, [key]: replace(object[key], rest) };
    };
    result = replace(result, issue.path);
  }
  return result;
}

/** One chat turn with validated tool calls. */
export async function chat(
  provider: LLMProvider,
  request: LLMRequest,
): Promise<LLMResponse> {
  assertRequest(request);
  const response = await provider.complete(request);
  // No tools offered: a call the model makes anyway runs nothing, so it is
  // dropped rather than failing the whole reply (D502).
  if (!request.tools?.length) return { ...response, toolCalls: [] };
  return {
    ...response,
    toolCalls: parseToolCalls(response.toolCalls, request.tools),
  };
}

const STRUCTURED_TOOL = "record_result";

/**
 * Structured output (extraction): the model must call one forced tool whose
 * input is the result. The result is returned only if the schema accepts it.
 */
export async function extractStructured<T extends z.ZodType>(
  provider: LLMProvider,
  input: {
    model: string;
    system: string;
    messages: LLMMessage[];
    schema: T;
    description: string;
    maxTokens: number;
  },
): Promise<{ data: z.infer<T>; usage: LLMUsage }> {
  const request: LLMRequest = {
    model: input.model,
    system: input.system,
    messages: input.messages,
    tools: [
      {
        name: STRUCTURED_TOOL,
        description: input.description,
        input: input.schema,
      },
    ],
    toolChoice: STRUCTURED_TOOL,
    maxTokens: input.maxTokens,
  };
  assertRequest(request);
  const response = await provider.complete(request);
  const call = response.toolCalls.find((c) => c.name === STRUCTURED_TOOL);
  if (!call) {
    throw new LLMOutputError("The model did not return a structured result");
  }
  const parsed = input.schema.safeParse(call.input);
  if (!parsed.success) {
    throw new LLMOutputError(
      "Structured result failed validation",
      parsed.error.issues,
    );
  }
  return { data: parsed.data, usage: response.usage };
}

type ScriptStep = LLMResponse | ((request: LLMRequest) => LLMResponse);

/** Scripted provider for tests: replies in order and records requests. */
export class FakeLLMProvider implements LLMProvider {
  readonly requests: LLMRequest[] = [];
  private readonly script: ScriptStep[];

  constructor(script: ScriptStep[]) {
    this.script = [...script];
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.requests.push(request);
    const next = this.script[0];
    const scriptedExtraction =
      !!next &&
      typeof next !== "function" &&
      next.toolCalls.some((call) => call.name === "record_result");
    // Profile extraction runs before the chat turn. A script that only
    // describes the chat reply still yields an empty extraction.
    if (
      request.toolChoice === "record_result" &&
      !scriptedExtraction &&
      typeof next !== "function"
    ) {
      return {
        text: "",
        toolCalls: [
          { id: "call_record_result", name: "record_result", input: {} },
        ],
        usage: { tokensIn: 0, tokensOut: 0 },
        stopReason: "tool_use",
      };
    }
    const step = this.script.shift();
    if (!step) throw new Error("FakeLLMProvider script is exhausted");
    return typeof step === "function" ? step(request) : step;
  }
}

/** Shorthand for a scripted text reply. */
export function fakeText(text: string, usage?: Partial<LLMUsage>): LLMResponse {
  return {
    text,
    toolCalls: [],
    usage: { tokensIn: usage?.tokensIn ?? 0, tokensOut: usage?.tokensOut ?? 0 },
    stopReason: "end",
  };
}

/** Shorthand for a scripted tool call. */
export function fakeToolCall(
  name: string,
  input: unknown,
  usage?: Partial<LLMUsage>,
): LLMResponse {
  return {
    text: "",
    toolCalls: [{ id: `call_${name}`, name, input }],
    usage: { tokensIn: usage?.tokensIn ?? 0, tokensOut: usage?.tokensOut ?? 0 },
    stopReason: "tool_use",
  };
}
