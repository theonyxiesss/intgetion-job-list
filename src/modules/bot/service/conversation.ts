import { createHash, randomBytes } from "node:crypto";
import { HttpError } from "@/lib/http";
import {
  AnthropicProvider,
  chat,
  circuitBreakerOpen,
  costMicroUsd,
  isCostAnomaly,
  LLMOutputError,
  MAX_OUTPUT_TOKENS,
  modelsFromEnv,
  pricesFromEnv,
  redactPii,
  trimContext,
  wrapUntrusted,
  type LLMMessage,
  type LLMProvider,
  type LLMToolCall,
  type PriceTable,
} from "@/lib/llm";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { systemPrompt, SYSTEM_PROMPT_VERSION } from "../prompts/system";
import * as repo from "../repo/bot-repo";
import {
  hashArgs,
  runTool,
  toolNeedsConfirmation,
  toolsFor,
  type BotState,
  type ToolContext,
} from "./tools";

/** 12.1 ConversationManager for the web channel (D172–D176). */

export const BOT_SESSION_COOKIE = "bot_session";
export const CONFIRMATION_TTL_MS = 10 * 60 * 1000;
/** Tool rounds per user message before the bot must answer in text. */
export const MAX_TOOL_ROUNDS = 3;
/** Messages read from the database to build the context (trimmed later). */
const HISTORY_READ = 24;
const DAY_MS = 24 * 60 * 60 * 1000;
const ANOMALY_DAYS = 14;

export type BotEvent =
  | { type: "token"; text: string }
  | { type: "tool_result"; name: string; kind: string; data: unknown }
  | {
      type: "confirm_request";
      confirmationId: string;
      tool: string;
      args: unknown;
      expiresAt: string;
    }
  | { type: "error"; code: string }
  | { type: "done"; conversationId: string };

export type Emit = (event: BotEvent) => void;

// ---- provider -------------------------------------------------------------

type BotLLM = { provider: LLMProvider; model: string; prices: PriceTable };

let providerOverride: BotLLM | null | undefined;

/** Test seam: a fake provider, or null for "not configured". */
export function setBotLLMForTests(value: BotLLM | null | undefined) {
  providerOverride = value;
}

/**
 * The bot works only with a key and a price for the chat model: without a
 * price the circuit breaker could not count (D171). Otherwise null.
 */
export function botLLM(env = process.env): BotLLM | null {
  if (providerOverride !== undefined) return providerOverride;
  const key = env.ANTHROPIC_API_KEY?.trim();
  const model = modelsFromEnv(env).chat;
  const prices = pricesFromEnv(env);
  if (!key || !prices[model]) return null;
  return { provider: new AnthropicProvider(key), model, prices };
}

// ---- session --------------------------------------------------------------

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * The conversation behind the `bot_session` cookie. A cookie that belongs
 * to someone else (a guest session after sign-in, another user) starts a new
 * conversation; linking a guest session is 7B. Returns the token to set.
 */
export async function resolveConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  if (input.token) {
    const found = await repo.findConversationByToken(
      hashSessionToken(input.token),
    );
    if (found && found.userId === input.userId) {
      return { conversation: found, token: input.token };
    }
  }
  const token = newSessionToken();
  const conversation = await repo.createConversation({
    userId: input.userId,
    tokenHash: hashSessionToken(token),
    locale: input.locale,
  });
  return { conversation, token };
}

/** Existing conversation only (history, confirmations); null when none. */
export async function findOwnConversation(
  userId: string | null,
  token: string | undefined,
) {
  if (!token) return null;
  const found = await repo.findConversationByToken(hashSessionToken(token));
  return found && found.userId === userId ? found : null;
}

// ---- budgets --------------------------------------------------------------

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * 12.5 limits: a guest has 30 messages a day per IP and session, a user
 * 200. A user whose cost today is above 3× their median falls back to the
 * guest limit and an alert is logged.
 */
async function enforceMessageLimits(
  userId: string | null,
  ip: string,
  tokenHash: string,
  now: Date,
) {
  if (!userId) {
    await enforceRateLimit("botGuest", `${ip}:${tokenHash}`, now);
    return;
  }
  await enforceRateLimit("botUser", userId, now);
  const today = startOfUtcDay(now);
  const days = await repo.userDailyCosts(
    userId,
    new Date(today.getTime() - ANOMALY_DAYS * DAY_MS),
  );
  const todayKey = today.toISOString().slice(0, 10);
  const spentToday = days.find((d) => d.day === todayKey)?.total ?? BigInt(0);
  const past = days.filter((d) => d.day !== todayKey).map((d) => d.total);
  if (isCostAnomaly(spentToday, past)) {
    logger.warn({ alert: "bot_cost_anomaly" }, "bot: user cost anomaly");
    await enforceRateLimit("botGuest", `anomaly:${userId}`, now);
  }
}

async function breakerOpen(now: Date) {
  const spent = await repo.spentSince(startOfUtcDay(now));
  const open = circuitBreakerOpen(spent, process.env.LLM_DAILY_BUDGET_USD);
  if (open) logger.error({ alert: "bot_budget" }, "bot: daily budget spent");
  return open;
}

// ---- history → model messages ---------------------------------------------

type StoredToolCall = { calls?: LLMToolCall[]; toolCallId?: string };

/**
 * Stored rows to provider messages. User text is untrusted data (12.4);
 * a system event reads as a bracketed note. A leading tool result whose
 * call was trimmed away is dropped so the history stays well-formed.
 */
export function toLLMMessages(rows: readonly repo.MessageRow[]): LLMMessage[] {
  const out: LLMMessage[] = [];
  for (const row of rows) {
    const meta = (row.toolCall ?? {}) as StoredToolCall;
    if (row.role === "user") {
      out.push({
        role: "user",
        content: wrapUntrusted("user_message", row.content),
      });
    } else if (row.role === "assistant") {
      if (!row.content && !meta.calls?.length) continue;
      out.push({
        role: "assistant",
        content: row.content,
        toolCalls: meta.calls,
      });
    } else if (row.role === "tool" && meta.toolCallId) {
      out.push({
        role: "tool",
        toolCallId: meta.toolCallId,
        content: row.content,
      });
    } else if (row.role === "system_event") {
      out.push({ role: "user", content: `[event] ${row.content}` });
    }
  }
  return startAtUser(out);
}

/** The context must open with a user turn (no orphan tool result). */
export function startAtUser(messages: readonly LLMMessage[]): LLMMessage[] {
  const first = messages.findIndex((message) => message.role === "user");
  return first === -1 ? [] : messages.slice(first);
}

// ---- one user message -----------------------------------------------------

export type MessageInput = {
  userId: string | null;
  conversation: repo.ConversationRow;
  text: string;
  ip: string;
  locale: string;
};

/**
 * Handles one user message and emits SSE events. Order: limits → store the
 * redacted text → breaker → up to 3 model rounds with read tools; a write
 * tool stops the turn with a confirmation card.
 */
export async function handleMessage(
  input: MessageInput,
  emit: Emit,
  now = new Date(),
): Promise<void> {
  const { conversation, userId } = input;
  await enforceMessageLimits(
    userId,
    input.ip,
    conversation.sessionTokenHash,
    now,
  );
  await repo.insertMessage({
    conversationId: conversation.id,
    role: "user",
    content: redactPii(input.text),
  });

  const llm = botLLM();
  if (!llm) {
    emit({ type: "error", code: "BOT_UNAVAILABLE" });
    return finish(input, conversation.state as BotState, emit, now);
  }
  if (await breakerOpen(now)) {
    emit({ type: "error", code: "BOT_BUDGET_EXCEEDED" });
    return finish(input, conversation.state as BotState, emit, now);
  }

  let state = conversation.state as BotState;
  const system = systemPrompt({
    locale: input.locale,
    signedIn: userId !== null,
  });
  const tools = toolsFor(userId);

  for (let round = 0; round < MAX_TOOL_ROUNDS + 1; round += 1) {
    const rows = await repo.listMessages(conversation.id, HISTORY_READ);
    const { messages } = trimContext({
      system,
      summary: conversation.summary ?? undefined,
      messages: toLLMMessages(rows),
    });
    const context = startAtUser(messages);
    const lastRound = round === MAX_TOOL_ROUNDS;
    let response;
    try {
      response = await chat(llm.provider, {
        model: llm.model,
        system,
        messages: context,
        tools: lastRound ? undefined : tools,
        maxTokens: MAX_OUTPUT_TOKENS,
      });
    } catch (error) {
      logger.warn(
        { err: error, invalidOutput: error instanceof LLMOutputError },
        "bot: model call failed",
      );
      emit({ type: "error", code: "BOT_TRY_LATER" });
      return finish(input, state, emit, now);
    }
    const cost = costMicroUsd(llm.model, response.usage, llm.prices);
    const calls = lastRound ? [] : response.toolCalls;
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: response.text,
      toolCall: calls.length
        ? { calls, promptVersion: SYSTEM_PROMPT_VERSION }
        : { promptVersion: SYSTEM_PROMPT_VERSION },
      tokensIn: response.usage.tokensIn,
      tokensOut: response.usage.tokensOut,
      costMicroUsd: cost,
    });
    if (response.text) emit({ type: "token", text: response.text });
    if (!calls.length) break;

    let waiting = false;
    for (const call of calls) {
      const ctx: ToolContext = {
        userId,
        conversationId: conversation.id,
        locale: input.locale,
        state,
      };
      const content = await callTool(ctx, call, emit, now);
      if (content.state) state = content.state;
      if (content.waiting) waiting = true;
      await repo.insertMessage({
        conversationId: conversation.id,
        role: "tool",
        content: content.llm,
        toolCall: { toolCallId: call.id, name: call.name },
      });
    }
    if (waiting) break;
  }
  return finish(input, state, emit, now);
}

async function callTool(
  ctx: ToolContext,
  call: LLMToolCall,
  emit: Emit,
  now: Date,
): Promise<{ llm: string; state?: BotState; waiting?: boolean }> {
  if (ctx.userId && toolNeedsConfirmation(ctx, call.name)) {
    const confirmation = await repo.createConfirmation({
      conversationId: ctx.conversationId,
      userId: ctx.userId,
      tool: call.name,
      args: call.input,
      argsHash: hashArgs(call.name, call.input),
      expiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
    });
    emit({
      type: "confirm_request",
      confirmationId: confirmation.id,
      tool: call.name,
      args: call.input,
      expiresAt: confirmation.expiresAt.toISOString(),
    });
    return {
      llm: "A confirmation card was shown. Nothing is done until the user accepts it.",
      waiting: true,
    };
  }
  try {
    const outcome = await runTool(ctx, call.name, call.input);
    if (outcome.client) {
      emit({
        type: "tool_result",
        name: call.name,
        kind: outcome.client.kind,
        data: outcome.client.data,
      });
    }
    return { llm: outcome.llm, state: outcome.state };
  } catch (error) {
    if (error instanceof HttpError) return { llm: `Error: ${error.code}` };
    throw error;
  }
}

async function finish(
  input: MessageInput,
  state: BotState,
  emit: Emit,
  now: Date,
) {
  await repo.updateConversation(
    input.conversation.id,
    { state, locale: input.locale },
    now,
  );
  emit({ type: "done", conversationId: input.conversation.id });
}

// ---- confirmations --------------------------------------------------------

/**
 * `POST /api/bot/confirm` (12.3, P8): the card's answer. The confirmation
 * is taken once, must be the user's, in this conversation and not expired;
 * the tool runs with exactly the stored arguments.
 */
export async function confirmAction(
  input: {
    userId: string;
    conversation: repo.ConversationRow;
    confirmationId: string;
    accept: boolean;
  },
  now = new Date(),
) {
  const row = await repo.decideConfirmation({
    id: input.confirmationId,
    userId: input.userId,
    conversationId: input.conversation.id,
    accepted: input.accept,
    now,
  });
  if (!row) {
    throw new HttpError(
      410,
      "CONFIRMATION_EXPIRED",
      "This confirmation is used or expired",
    );
  }
  if (!input.accept) {
    await repo.insertMessage({
      conversationId: input.conversation.id,
      role: "system_event",
      content: `The user declined ${row.tool}.`,
    });
    return { accepted: false as const };
  }
  const ctx: ToolContext = {
    userId: input.userId,
    conversationId: input.conversation.id,
    locale: input.conversation.locale ?? "en",
    state: input.conversation.state as BotState,
  };
  try {
    const outcome = await runTool(ctx, row.tool, row.args, {
      tool: row.tool,
      argsHash: row.argsHash,
      userId: row.userId,
    });
    await repo.insertMessage({
      conversationId: input.conversation.id,
      role: "system_event",
      content: `The user confirmed ${row.tool}. ${outcome.llm}`,
    });
    return { accepted: true as const, result: outcome.client ?? null };
  } catch (error) {
    if (error instanceof HttpError) {
      await repo.insertMessage({
        conversationId: input.conversation.id,
        role: "system_event",
        content: `The user confirmed ${row.tool}, but it failed: ${error.code}.`,
      });
    }
    throw error;
  }
}

/** `GET /api/bot/conversation`: the last 50 visible messages. */
export async function conversationHistory(conversationId: string) {
  const rows = await repo.listMessages(conversationId, 50);
  return rows
    .filter(
      (row) =>
        (row.role === "user" ||
          row.role === "assistant" ||
          row.role === "system_event") &&
        row.content,
    )
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    }));
}
