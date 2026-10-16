import { createHash, randomBytes } from "node:crypto";
import { HttpError } from "@/lib/http";
import {
  chat,
  circuitBreakerOpen,
  costMicroUsd,
  isCostAnomaly,
  LLMOutputError,
  llmFromEnv,
  MAX_OUTPUT_TOKENS,
  modelsFromEnv,
  redactPii,
  trimContext,
  wrapUntrusted,
  type LLMMessage,
  type LLMProvider,
  type LLMToolCall,
  type PriceTable,
} from "@/lib/llm";
import { logger } from "@/lib/logger";
import { botMessageBucket, enforceRateLimit } from "@/lib/rate-limit";
import { billingMe } from "@/modules/billing/service";
import {
  candidatePatchInput,
  patchCandidateProfile,
} from "@/modules/candidates/service";
import { matchSkillSlug } from "@/modules/taxonomy/service";
import { getJobForPublic } from "@/modules/jobs/service";
import {
  getOrderForParty,
  getPublishedServiceById,
} from "@/modules/freelance/service";
import { systemPrompt, SYSTEM_PROMPT_VERSION } from "../prompts/system";
import {
  askWhy,
  chooseVacancy,
  hadOffGoal,
  installVacancyReader,
  isPoliteNo,
  isPoliteYes,
  judgeFit,
  passedIdsOf,
  personAskedOffGoal,
  personFromDraft,
  presentVacancy,
  rememberPass,
  replyLanguage,
  shapeToolCalls,
  stripOffGoalEnding,
  suitsAck,
  vacancyFromPublic,
  vacancyReader,
  type FitJudgement,
  type JobCardFacts,
  type VacancyFacts,
} from "./fit";
import {
  freelanceFocusBlock,
  freelanceOpener,
  freelanceTopicState,
  type FreelanceFocus,
} from "./freelance-focus";
import { jobFocusBlock, jobFocusOpener, readJobFocus } from "./job-focus";
import {
  isServiceFrom,
  serviceFocusBlock,
  serviceFocusOpener,
  serviceTopicState,
} from "./service-focus";
import {
  ugcFocusBlock,
  ugcHomeOpener,
  ugcThreadOpener,
  ugcTopicState,
} from "./ugc-focus";
import { stripLeakedToolMarkup } from "./leaked-tool";
import {
  followUp,
  hasSearchFact,
  mergeDraft,
  mergeNotes,
  profileSavedLine,
  readyToSearch,
  rememberUtterance,
  resumeAck,
  signupHint,
  spokiFillIntro,
} from "./memory";
import * as repo from "../repo/bot-repo";
import { draftFromExtraction, extractDraft } from "./extract";
import {
  hashArgs,
  runTool,
  toolCardFields,
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
      /** Fields the person types into the card (D460). */
      fields?: readonly string[];
    }
  | { type: "error"; code: string }
  | { type: "signup_hint"; text: string }
  | { type: "resume_ack"; text: string }
  | { type: "fill_choice" }
  | { type: "profile_saved"; text: string }
  | { type: "done"; conversationId: string };

export type ChatActions = {
  signup: boolean;
  fillChoice: boolean;
  profileReview: boolean;
};

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
 * price the circuit breaker could not count (D171); free OpenRouter models
 * count as zero (D213). Otherwise null.
 */
export function botLLM(env = process.env): BotLLM | null {
  if (providerOverride !== undefined) return providerOverride;
  // Anthropic or OpenRouter, chosen by LLM_PROVIDER (D213).
  const setup = llmFromEnv(env);
  if (!setup) return null;
  return {
    provider: setup.provider,
    model: setup.models.chat,
    prices: setup.prices,
  };
}

// ---- session --------------------------------------------------------------

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * A guest conversation (no user) becomes this user's when they sign in
 * (D182). A conversation that already belongs to someone else is left
 * alone. Returns the claimed row, or undefined when there was nothing to claim.
 */
async function claimGuestConversation(input: {
  userId: string | null;
  token: string | undefined;
}): Promise<repo.ConversationRow | undefined> {
  if (!input.userId || !input.token) return undefined;
  const found = await repo.findConversationByToken(
    hashSessionToken(input.token),
  );
  if (!found || found.userId !== null) return undefined;
  const state = (found.state ?? {}) as BotState;
  const draft = state.draft;
  const hasDraft = !!draft && Object.keys(draft).length > 0;
  return repo.claimConversation(found.id, input.userId, {
    ...state,
    ...(hasDraft ? { resumeAckPending: true } : {}),
  });
}

/**
 * The conversation behind the `bot_session` cookie. A cookie that belongs
 * to another user starts a new conversation. A guest cookie is attached
 * to the signed-in user (D182). Returns the token to set.
 */
function postgresCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const row = error as { code?: string; cause?: { code?: string } };
  return row.code ?? row.cause?.code;
}

/**
 * Opens the thread for one vacancy. A signed-in person keeps a separate
 * history per job. The general chat stays the thread with no job id (D382).
 */
export async function openJobConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
  jobId: string;
}): Promise<{ conversation: repo.ConversationRow; token: string } | null> {
  const focus = await readJobFocus(input.userId, input.jobId, input.locale);
  if (!focus) return null;
  let conversation: repo.ConversationRow | undefined;
  let token = input.token;
  if (input.userId) {
    conversation = await repo.findConversationForUserJob(
      input.userId,
      input.jobId,
    );
  } else if (input.token) {
    const byCookie = await repo.findConversationByToken(
      hashSessionToken(input.token),
    );
    if (
      byCookie &&
      byCookie.userId === null &&
      byCookie.jobId === input.jobId
    ) {
      conversation = byCookie;
    }
  }
  if (!conversation && input.userId && input.token) {
    const byCookie = await repo.findConversationByToken(
      hashSessionToken(input.token),
    );
    if (
      byCookie &&
      byCookie.userId === null &&
      byCookie.jobId === input.jobId
    ) {
      conversation = await repo.claimConversation(
        byCookie.id,
        input.userId,
        byCookie.state,
      );
      token = input.token;
    }
  }
  if (!conversation) {
    token = newSessionToken();
    try {
      conversation = await repo.createConversation({
        userId: input.userId,
        tokenHash: hashSessionToken(token),
        locale: input.locale,
        jobId: input.jobId,
      });
    } catch (error) {
      if (!input.userId || postgresCode(error) !== "23505") throw error;
      conversation = await repo.findConversationForUserJob(
        input.userId,
        input.jobId,
      );
      if (!conversation) throw error;
    }
  }
  if (!token || hashSessionToken(token) !== conversation.sessionTokenHash) {
    token = newSessionToken();
    await repo.replaceSessionToken(conversation.id, hashSessionToken(token));
    conversation = {
      ...conversation,
      sessionTokenHash: hashSessionToken(token),
    };
  }
  const existing = await repo.listMessages(conversation.id, 1);
  if (existing.length === 0) {
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: jobFocusOpener(input.locale, focus.title, focus.company),
    });
  }
  return { conversation, token };
}

export async function resolveConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
  /** Skip a vacancy thread on the cookie and use the general chat (D423). */
  generalOnly?: boolean;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  if (input.token) {
    const claimed = await claimGuestConversation(input);
    const found =
      claimed ??
      (await repo.findConversationByToken(hashSessionToken(input.token)));
    if (
      found &&
      found.userId === input.userId &&
      (!input.generalOnly ||
        (found.jobId === null &&
          found.campaignId === null &&
          found.inviteId === null))
    ) {
      return { conversation: found, token: input.token };
    }
  }
  if (input.userId) {
    const latest = await repo.latestGeneralConversationForUser(input.userId);
    if (latest) {
      const token = newSessionToken();
      await repo.replaceSessionToken(latest.id, hashSessionToken(token));
      return {
        conversation: { ...latest, sessionTokenHash: hashSessionToken(token) },
        token,
      };
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

/**
 * The general thread, marked as a visit from /services. Inserts the company
 * opener only when that thread has no messages yet (D423).
 */
export async function openServiceConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  const opened = await resolveConversation({ ...input, generalOnly: true });
  const previous = (opened.conversation.state ?? {}) as BotState;
  const state = serviceTopicState(previous);
  let conversation = opened.conversation;
  if (state !== previous) {
    await repo.updateConversation(
      conversation.id,
      { state, locale: input.locale },
      new Date(),
    );
    conversation = { ...conversation, state, locale: input.locale };
  }
  const existing = await repo.listMessages(conversation.id, 1);
  if (existing.length === 0) {
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: serviceFocusOpener(input.locale),
    });
  }
  return { conversation, token: opened.token };
}

/**
 * The general thread for writing a creative-test brief (D457).
 * Inserts the opener only when that thread has no messages yet.
 */
export async function openUgcHomeConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  const opened = await resolveConversation({ ...input, generalOnly: true });
  const previous = (opened.conversation.state ?? {}) as BotState;
  const state = ugcTopicState(previous);
  let conversation = opened.conversation;
  if (state !== previous) {
    await repo.updateConversation(
      conversation.id,
      { state, locale: input.locale },
      new Date(),
    );
    conversation = { ...conversation, state, locale: input.locale };
  }
  const existing = await repo.listMessages(conversation.id, 1);
  if (existing.length === 0) {
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: ugcHomeOpener(input.locale),
    });
  }
  return { conversation, token: opened.token };
}

/**
 * One thread per brief or per invite. The first line names the product.
 */
export async function openUgcThread(input: {
  userId: string;
  token: string | undefined;
  locale: string;
  campaignId?: string;
  inviteId?: string;
  productName: string;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  const product = input.productName.replace(/[\r\n]+/g, " ").slice(0, 120);
  let conversation = input.campaignId
    ? await repo.findConversationForUserCampaign(input.userId, input.campaignId)
    : input.inviteId
      ? await repo.findConversationForUserInvite(input.userId, input.inviteId)
      : undefined;
  let token = input.token;
  if (!conversation) {
    token = newSessionToken();
    conversation = await repo.createConversation({
      userId: input.userId,
      tokenHash: hashSessionToken(token),
      locale: input.locale,
      campaignId: input.campaignId ?? null,
      inviteId: input.inviteId ?? null,
    });
  }
  const state = {
    ...ugcTopicState((conversation.state ?? {}) as BotState),
    ugcCampaignId: input.campaignId,
    ugcProduct: product,
  };
  await repo.updateConversation(
    conversation.id,
    { state, locale: input.locale },
    new Date(),
  );
  conversation = { ...conversation, state, locale: input.locale };
  const existing = await repo.listMessages(conversation.id, 1);
  if (existing.length === 0) {
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: ugcThreadOpener(input.locale, product),
    });
  }
  if (!token || hashSessionToken(token) !== conversation.sessionTokenHash) {
    token = newSessionToken();
    await repo.replaceSessionToken(conversation.id, hashSessionToken(token));
  }
  return { conversation, token };
}

/**
 * The service or order a `/chat?service=` or `/chat?order=` link names, if
 * this person may read it. A stranger's order is null, as a 404 would be.
 */
export async function readFreelanceFocus(
  userId: string | null,
  ids: { serviceId?: string; orderId?: string },
): Promise<FreelanceFocus | null> {
  try {
    if (ids.orderId && userId) {
      const order = await getOrderForParty(userId, ids.orderId);
      return { kind: "order", id: order.id, title: order.serviceTitle };
    }
    if (ids.serviceId) {
      const service = await getPublishedServiceById(ids.serviceId);
      if (service) {
        return { kind: "service", id: service.id, title: service.title };
      }
    }
  } catch (error) {
    if (!(error instanceof HttpError)) throw error;
  }
  return null;
}

/**
 * The general thread, turned to one freelance service or order (28.8).
 * The opener is written when the thread turns to it, not on every load.
 */
export async function openFreelanceConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
  focus: FreelanceFocus;
}): Promise<{ conversation: repo.ConversationRow; token: string }> {
  const opened = await resolveConversation({ ...input, generalOnly: true });
  const previous = (opened.conversation.state ?? {}) as BotState;
  const state = freelanceTopicState(previous, input.focus);
  let conversation = opened.conversation;
  if (state) {
    await repo.updateConversation(
      conversation.id,
      { state, locale: input.locale },
      new Date(),
    );
    conversation = { ...conversation, state, locale: input.locale };
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: freelanceOpener(input.locale, input.focus),
    });
  }
  return { conversation, token: opened.token };
}

/** Cards still open in this thread, so a reload or a Telegram link shows them. */
export async function pendingConfirmations(
  conversationId: string,
  userId: string | null,
  now = new Date(),
): Promise<Extract<BotEvent, { type: "confirm_request" }>[]> {
  if (!userId) return [];
  const rows = await repo.listOpenConfirmations({
    conversationId,
    userId,
    now,
  });
  return rows.map((row) => ({
    type: "confirm_request" as const,
    confirmationId: row.id,
    tool: row.tool,
    args: row.args,
    expiresAt: row.expiresAt.toISOString(),
    fields: toolCardFields(row.tool),
  }));
}

/** The thread a card belongs to, when the card is this user's (D460). */
export async function findConfirmationConversation(
  userId: string,
  confirmationId: string,
) {
  return repo.findConversationOfConfirmation(confirmationId, userId);
}

/**
 * One confirmation card for a claimed guest draft. The flag is cleared in
 * the same update that wins, so a second request does not create another card.
 */
export async function takeDraftOffer(
  conversation: repo.ConversationRow,
  userId: string | null,
  now = new Date(),
): Promise<Extract<BotEvent, { type: "confirm_request" }> | null> {
  if (!userId) return null;
  const won = await repo.takeDraftOfferFlag(conversation.id);
  if (!won) return null;
  const draft = ((won.state ?? {}) as BotState).draft;
  const parsed = candidatePatchInput.safeParse(draft);
  if (!parsed.success) return null;
  const confirmation = await repo.createConfirmation({
    conversationId: won.id,
    userId,
    tool: "propose_profile_update",
    args: parsed.data,
    argsHash: hashArgs("propose_profile_update", parsed.data),
    expiresAt: new Date(now.getTime() + CONFIRMATION_TTL_MS),
  });
  return {
    type: "confirm_request",
    confirmationId: confirmation.id,
    tool: "propose_profile_update",
    args: parsed.data,
    expiresAt: confirmation.expiresAt.toISOString(),
  };
}

/**
 * History for the current cookie. Claims a guest conversation when the
 * caller is signed in, and may include one draft-save card (D182).
 * Does not create a conversation.
 */
export async function resumeConversation(input: {
  userId: string | null;
  token: string | undefined;
  locale?: string;
  jobId?: string;
  /** `services` from Services, `campaigns` from creative tests (D423, D457). */
  from?: string;
  campaignId?: string;
  inviteId?: string;
  productName?: string;
  /** Resolved by `readFreelanceFocus` (D460). */
  freelance?: FreelanceFocus | null;
}): Promise<{
  conversation: repo.ConversationRow | null;
  offer: Extract<BotEvent, { type: "confirm_request" }> | null;
  token?: string;
  actions: ChatActions;
}> {
  const empty = {
    conversation: null,
    offer: null,
    actions: chatActions(input.userId, {}),
  };
  if (input.jobId) {
    const opened = await openJobConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale ?? "en",
      jobId: input.jobId,
    });
    if (!opened) return empty;
    const offer = await takeDraftOffer(
      opened.conversation,
      input.userId,
      new Date(),
    );
    return {
      conversation: opened.conversation,
      offer,
      token: opened.token,
      actions: chatActions(
        input.userId,
        (opened.conversation.state ?? {}) as BotState,
      ),
    };
  }
  if (
    input.userId &&
    input.productName &&
    (input.campaignId || input.inviteId)
  ) {
    const opened = await openUgcThread({
      userId: input.userId,
      token: input.token,
      locale: input.locale ?? "en",
      campaignId: input.campaignId,
      inviteId: input.inviteId,
      productName: input.productName,
    });
    const offer = await takeDraftOffer(
      opened.conversation,
      input.userId,
      new Date(),
    );
    return {
      conversation: opened.conversation,
      offer,
      token: opened.token,
      actions: chatActions(
        input.userId,
        (opened.conversation.state ?? {}) as BotState,
      ),
    };
  }
  if (input.freelance) {
    const opened = await openFreelanceConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale ?? "en",
      focus: input.freelance,
    });
    const offer = await takeDraftOffer(
      opened.conversation,
      input.userId,
      new Date(),
    );
    return {
      conversation: opened.conversation,
      offer,
      token: opened.token,
      actions: chatActions(
        input.userId,
        (opened.conversation.state ?? {}) as BotState,
      ),
    };
  }
  if (input.from === "campaigns") {
    const opened = await openUgcHomeConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale ?? "en",
    });
    const offer = await takeDraftOffer(
      opened.conversation,
      input.userId,
      new Date(),
    );
    return {
      conversation: opened.conversation,
      offer,
      token: opened.token,
      actions: chatActions(
        input.userId,
        (opened.conversation.state ?? {}) as BotState,
      ),
    };
  }
  if (isServiceFrom(input.from)) {
    const opened = await openServiceConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale ?? "en",
    });
    const offer = await takeDraftOffer(
      opened.conversation,
      input.userId,
      new Date(),
    );
    return {
      conversation: opened.conversation,
      offer,
      token: opened.token,
      actions: chatActions(
        input.userId,
        (opened.conversation.state ?? {}) as BotState,
      ),
    };
  }
  let found: repo.ConversationRow | undefined;
  let issued: string | undefined;
  if (input.token) {
    const claimed = await claimGuestConversation(input);
    const byCookie =
      claimed ??
      (await repo.findConversationByToken(hashSessionToken(input.token)));
    if (
      byCookie &&
      byCookie.userId === input.userId &&
      byCookie.jobId === null &&
      byCookie.campaignId === null &&
      byCookie.inviteId === null
    ) {
      found = byCookie;
    }
  }
  if (!found && input.userId) {
    const latest = await repo.latestGeneralConversationForUser(input.userId);
    if (latest) {
      issued = newSessionToken();
      await repo.replaceSessionToken(latest.id, hashSessionToken(issued));
      found = { ...latest, sessionTokenHash: hashSessionToken(issued) };
    }
  }
  if (!found) return empty;
  const acked = await acknowledgeResume(found, found.locale ?? "en");
  const conversation = acked ?? found;
  const offer = await takeDraftOffer(conversation, input.userId, new Date());
  return {
    conversation,
    offer,
    token: issued,
    actions: chatActions(input.userId, (conversation.state ?? {}) as BotState),
  };
}

export function chatActions(
  userId: string | null,
  state: BotState,
): ChatActions {
  return {
    signup: !userId && !!state.signupHintShown && hasSearchFact(state.draft),
    fillChoice: !!userId && !!state.resumeAckShown && !state.fillMode,
    profileReview: userId !== null && state.fillMode === "spoki",
  };
}

/** Existing conversation only (history, confirmations); null when none. */
export async function findOwnConversation(
  userId: string | null,
  token: string | undefined,
) {
  if (token) {
    const found = await repo.findConversationByToken(hashSessionToken(token));
    if (found && found.userId === userId) return found;
  }
  if (!userId) return null;
  return (await repo.latestConversationForUser(userId)) ?? null;
}

// ---- budgets --------------------------------------------------------------

function startOfUtcDay(now: Date) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * D323: a guest has 5 messages a day per IP and session, a free user 15.
 * Plus is 100 and Pro is 300 (D364). A user whose cost today is above 3×
 * their median falls back to the guest limit and an alert is logged.
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
  let plan: "free" | "plus" | "pro" = "free";
  try {
    plan = (await billingMe(userId)).candidatePlan;
  } catch (err) {
    logger.warn({ err }, "bot: plan lookup failed, free cap");
  }
  await enforceRateLimit(botMessageBucket(plan), userId, now);
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

/**
 * One continuation after a guest thread is claimed (D324). The flag is
 * cleared in the update that wins, so a second request does not repeat it.
 */
async function acknowledgeResume(
  conversation: repo.ConversationRow,
  locale: string,
  emit?: Emit,
): Promise<repo.ConversationRow | undefined> {
  const won = await repo.takeResumeAck(conversation.id);
  if (!won) return undefined;
  const state = (won.state ?? {}) as BotState;
  const text = resumeAck(locale, state.draft);
  await repo.insertMessage({
    conversationId: won.id,
    role: "assistant",
    content: text,
  });
  emit?.({ type: "resume_ack", text });
  emit?.({ type: "fill_choice" });
  return { ...won, locale };
}

/**
 * Live extraction on whatever provider is configured (D317, D324).
 * A failed extraction does not drop the turn. Unknown skills are matched
 * read-only.
 */
async function absorbExtraction(
  input: MessageInput,
  llm: BotLLM,
  state: BotState,
  emit: Emit,
): Promise<BotState> {
  try {
    const rows = await repo.listMessages(input.conversation.id, HISTORY_READ);
    const messages = startAtUser(toLLMMessages(rows)).filter(
      (message) => message.role !== "tool",
    );
    const models = modelsFromEnv();
    const model = llm.prices[models.extract] ? models.extract : llm.model;
    const extracted = await extractDraft(llm.provider, model, messages);
    const cost = costMicroUsd(model, extracted.usage, llm.prices);
    await repo.insertMessage({
      conversationId: input.conversation.id,
      role: "assistant",
      content: "",
      tokensIn: extracted.usage.tokensIn,
      tokensOut: extracted.usage.tokensOut,
      costMicroUsd: cost,
    });
    const { patch, notes } = await draftFromExtraction(
      extracted.data,
      matchSkillSlug,
    );
    let next: BotState = state;
    if (patch) next = { ...next, draft: mergeDraft(next.draft, patch) };
    if (notes) next = { ...next, notes: mergeNotes(next.notes, notes) };
    if (input.userId && next.fillMode === "spoki" && patch) {
      next = await saveFilledProfile(input, next, emit);
    }
    return next;
  } catch (error) {
    logger.warn({ err: error }, "bot: profile extraction skipped");
    return state;
  }
}

/** Writes the allowlisted draft after the person asked Spoki to fill it. */
async function saveFilledProfile(
  input: MessageInput,
  state: BotState,
  emit: Emit,
): Promise<BotState> {
  if (!input.userId) return state;
  const parsed = candidatePatchInput.safeParse(state.draft ?? {});
  if (!parsed.success) return state;
  try {
    await patchCandidateProfile(input.userId, parsed.data);
  } catch (error) {
    logger.warn({ err: error }, "bot: profile fill kept in the draft");
    return state;
  }
  const text = profileSavedLine(input.locale);
  await repo.insertMessage({
    conversationId: input.conversation.id,
    role: "assistant",
    content: text,
  });
  emit({ type: "profile_saved", text });
  return state;
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
  const acked = await acknowledgeResume(conversation, input.locale, emit);
  const current = acked ?? conversation;
  await repo.insertMessage({
    conversationId: current.id,
    role: "user",
    content: redactPii(input.text),
  });

  let state: BotState = {
    ...(current.state as BotState),
    draft: rememberUtterance((current.state as BotState).draft, input.text),
  };
  const offer = await takeDraftOffer(current, userId, now);
  if (offer) {
    emit(offer);
    state = { ...state, needsDraftOffer: false };
  }

  const llm = botLLM();
  if (!llm) {
    emit({ type: "error", code: "BOT_UNAVAILABLE" });
    return finish(input, state, emit, now);
  }
  if (await breakerOpen(now)) {
    emit({ type: "error", code: "BOT_BUDGET_EXCEEDED" });
    return finish(input, state, emit, now);
  }

  state = await absorbExtraction(input, llm, state, emit);

  const focus = current.jobId
    ? await readJobFocus(userId, current.jobId, input.locale)
    : null;
  const system = systemPrompt({
    locale: input.locale,
    signedIn: userId !== null,
    draft: state.draft,
    notes: state.notes,
    profileFill: state.fillMode === "spoki",
    jobFocus: focus ? jobFocusBlock(focus) : undefined,
    serviceFocus:
      !current.jobId && state.topic === "services"
        ? serviceFocusBlock()
        : undefined,
    ugcFocus:
      !current.jobId && state.topic === "ugc"
        ? ugcFocusBlock(state.ugcProduct ?? "")
        : undefined,
    freelanceFocus: current.jobId ? undefined : freelanceFocusBlock(state),
  });
  const tools = toolsFor(userId);
  const lang = replyLanguage(input.text, input.locale);
  const focusedId = current.jobId;
  const knownJobId = state.presentedJobId ?? focusedId ?? null;
  if (isPoliteYes(input.text) && knownJobId) {
    state = { ...state, presentedJobId: knownJobId, verdict: "suits" };
    const text = suitsAck(lang);
    await repo.insertMessage({
      conversationId: current.id,
      role: "assistant",
      content: text,
    });
    emit({ type: "token", text });
    return finish(input, state, emit, now);
  }
  if (isPoliteNo(input.text) && knownJobId) {
    const passed = rememberPass(passedIdsOf(state), knownJobId);
    state = {
      ...state,
      passedJobIds: passed,
      presentedJobId: undefined,
      verdict: "declined",
    };
    const declined = await callTool(
      {
        userId,
        conversationId: current.id,
        locale: input.locale,
        state,
      },
      { id: "call_server_search", name: "search_jobs", input: {} },
      emit,
      now,
    );
    if (declined.state)
      state = {
        ...state,
        ...declined.state,
        passedJobIds: passed,
        verdict: "declined",
      };
    await repo.insertMessage({
      conversationId: current.id,
      role: "tool",
      content: declined.llm,
      toolCall: { toolCallId: "call_server_search", name: "search_jobs" },
    });
    const choice = await chooseVacancy({
      cards: declined.jobCards ?? [],
      person: personFromDraft(state.draft),
      skipIds: passed,
      locale: input.locale,
    });
    const text =
      choice.kind === "show"
        ? presentVacancy(lang, choice.job, choice.judgement)
        : askWhy(lang);
    if (choice.kind === "show")
      state = { ...state, presentedJobId: choice.job.id };
    await repo.insertMessage({
      conversationId: current.id,
      role: "assistant",
      content: text,
    });
    emit({ type: "token", text });
    return finish(input, state, emit, now);
  }

  let spoke = false;
  let waiting = false;
  let showedJobs = false;
  let fitSpoken = false;

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
    const modelCalls = lastRound ? [] : response.toolCalls;
    const calls = shapeToolCalls(modelCalls, {
      userText: input.text,
      ready: readyToSearch(state.draft),
      jobThread: Boolean(focusedId),
      showedJobs,
      waiting,
    });
    const stripped = stripOffGoalEnding(
      stripLeakedToolMarkup(response.text),
      input.text,
    );
    const askedOffGoal = personAskedOffGoal(input.text);
    const visible = askedOffGoal
      ? stripped
      : hadOffGoal(response.text)
        ? ""
        : stripped;
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: visible,
      toolCall: calls.length
        ? { calls, promptVersion: SYSTEM_PROMPT_VERSION }
        : { promptVersion: SYSTEM_PROMPT_VERSION },
      tokensIn: response.usage.tokensIn,
      tokensOut: response.usage.tokensOut,
      costMicroUsd: cost,
    });
    if (visible) {
      spoke = true;
      emit({ type: "token", text: visible });
    }

    let roundCards: JobCardFacts[] = [];
    if (calls.length) {
      for (const call of calls) {
        const ctx: ToolContext = {
          userId,
          conversationId: conversation.id,
          locale: input.locale,
          state,
        };
        const content = await callTool(ctx, call, emit, now);
        if (content.state) state = content.state;
        if (content.jobs) showedJobs = true;
        if (content.jobCards?.length) roundCards = content.jobCards;
        if (content.waiting) waiting = true;
        await repo.insertMessage({
          conversationId: conversation.id,
          role: "tool",
          content: content.llm,
          toolCall: { toolCallId: call.id, name: call.name },
        });
      }
    }
    if (!waiting && !fitSpoken) {
      const line = await fitLineForTurn({
        locale: input.locale,
        lang,
        focusedId,
        focus,
        cards: roundCards,
        state,
      });
      if (line && (!spoke || hadOffGoal(response.text))) {
        state = {
          ...state,
          ...(line.presentedJobId
            ? { presentedJobId: line.presentedJobId }
            : {}),
        };
        await repo.insertMessage({
          conversationId: conversation.id,
          role: "assistant",
          content: line.text,
        });
        emit({ type: "token", text: line.text });
        spoke = true;
        fitSpoken = true;
      }
    }
    if (waiting) break;
    if (!calls.length) break;
    // The server search is the reply. Do not take another model round.
    if (calls.every((call) => call.id === "call_server_search")) break;
  }
  if (!spoke && !waiting && !showedJobs) {
    const text = followUp(
      input.locale,
      state.draft,
      state.fillMode === "spoki",
    );
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: text,
    });
    emit({ type: "token", text });
  }
  return finish(input, state, emit, now);
}

function cardsFrom(data: unknown): JobCardFacts[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const card = row as Record<string, unknown>;
    if (typeof card.id !== "string") return [];
    return [
      {
        id: card.id,
        title: typeof card.title === "string" ? card.title : "",
        companyName:
          typeof card.companyName === "string" ? card.companyName : "",
        workFormat: typeof card.workFormat === "string" ? card.workFormat : "",
      },
    ];
  });
}

async function fitLineForTurn(input: {
  locale: string;
  lang: string;
  focusedId: string | null;
  focus: { jobId: string; title: string; company: string } | null;
  cards: JobCardFacts[];
  state: BotState;
}): Promise<{ text: string; presentedJobId?: string } | null> {
  const passed = passedIdsOf(input.state);
  const person = personFromDraft(input.state.draft);
  if (input.focusedId && !passed.includes(input.focusedId)) {
    let vacancy: VacancyFacts | null = null;
    try {
      vacancy = await vacancyReader(input.focusedId, input.locale);
    } catch {
      vacancy = null;
    }
    if (!vacancy && input.focus) {
      vacancy = {
        id: input.focus.jobId,
        title: input.focus.title,
        company: input.focus.company,
        workFormat: "",
        skills: [],
      };
    }
    if (!vacancy) return null;
    const judged = judgeFit(person, vacancy);
    const judgement: Extract<FitJudgement, { show: true }> = judged.show
      ? judged
      : { show: true, kind: "good", matches: [], gaps: [] };
    return {
      text: presentVacancy(input.lang, vacancy, judgement),
      presentedJobId: vacancy.id,
    };
  }
  if (!readyToSearch(input.state.draft) || input.cards.length === 0)
    return null;
  const choice = await chooseVacancy({
    cards: input.cards,
    person,
    skipIds: passed,
    locale: input.locale,
  });
  if (choice.kind === "show") {
    return {
      text: presentVacancy(input.lang, choice.job, choice.judgement),
      presentedJobId: choice.job.id,
    };
  }
  return { text: askWhy(input.lang) };
}

async function callTool(
  ctx: ToolContext,
  call: LLMToolCall,
  emit: Emit,
  now: Date,
): Promise<{
  llm: string;
  state?: BotState;
  waiting?: boolean;
  jobs?: boolean;
  jobCards?: JobCardFacts[];
}> {
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
      fields: toolCardFields(call.name),
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
    const data = outcome.client?.data;
    const jobs =
      (outcome.client?.kind === "jobs" || outcome.client?.kind === "matches") &&
      Array.isArray(data) &&
      data.length > 0;
    return {
      llm: outcome.llm,
      state: outcome.state,
      jobs,
      jobCards: jobs ? cardsFrom(data) : [],
    };
  } catch (error) {
    if (error instanceof HttpError) {
      const details =
        error.details === undefined ? "" : ` ${JSON.stringify(error.details)}`;
      return { llm: `Error: ${error.code}${details}` };
    }
    throw error;
  }
}

async function maybeSignup(
  input: MessageInput,
  state: BotState,
  emit: Emit,
): Promise<BotState> {
  if (input.userId || state.signupHintShown || !hasSearchFact(state.draft)) {
    return state;
  }
  const text = signupHint(input.locale);
  await repo.insertMessage({
    conversationId: input.conversation.id,
    role: "assistant",
    content: text,
  });
  emit({ type: "signup_hint", text });
  return { ...state, signupHintShown: true };
}

async function finish(
  input: MessageInput,
  state: BotState,
  emit: Emit,
  now: Date,
) {
  const next = await maybeSignup(input, state, emit);
  await repo.updateConversation(
    input.conversation.id,
    { state: next, locale: input.locale },
    now,
  );
  emit({ type: "done", conversationId: input.conversation.id });
}

/**
 * The person chose how to fill the profile after the guest thread was
 * claimed (D324). `spoki` writes allowlisted fields without a card.
 */
export async function setFillMode(
  conversation: repo.ConversationRow,
  userId: string,
  mode: "self" | "spoki",
): Promise<{ message: string | null; saved: boolean; messages: string[] }> {
  const locale = conversation.locale ?? "en";
  const previous = (conversation.state ?? {}) as BotState;
  const state: BotState = {
    ...previous,
    fillMode: mode,
    resumeAckPending: false,
    resumeAckShown: true,
  };
  let saved = false;
  if (mode === "spoki") {
    const parsed = candidatePatchInput.safeParse(state.draft ?? {});
    if (parsed.success) {
      try {
        await patchCandidateProfile(userId, parsed.data);
        saved = true;
      } catch (error) {
        logger.warn({ err: error }, "bot: profile fill kept in the draft");
      }
    }
  }
  await repo.updateConversation(conversation.id, { state }, new Date());
  const message = mode === "spoki" ? spokiFillIntro(locale) : null;
  if (message) {
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: message,
    });
  }
  const messages = message ? [message] : [];
  if (saved) {
    const savedLine = profileSavedLine(locale);
    messages.push(savedLine);
    await repo.insertMessage({
      conversationId: conversation.id,
      role: "assistant",
      content: savedLine,
    });
  }
  return { message, saved, messages };
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
    /** What the person typed into the card. Never sent to the model. */
    fields?: Record<string, unknown>;
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
    const outcome = await runTool(
      ctx,
      row.tool,
      row.args,
      {
        tool: row.tool,
        argsHash: row.argsHash,
        userId: row.userId,
      },
      input.fields,
    );
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
        content: `The user confirmed ${row.tool}, but it failed: ${error.code}${
          error.details === undefined ? "" : ` ${JSON.stringify(error.details)}`
        }.`,
      });
    }
    throw error;
  }
}

/** `GET /api/bot/conversation`: the last 50 visible messages. */
export async function conversationHistory(conversationId: string) {
  const rows = await repo.listMessages(conversationId, 50);
  const visible = rows.flatMap((row) => {
    if (
      row.role !== "user" &&
      row.role !== "assistant" &&
      row.role !== "system_event"
    ) {
      return [];
    }
    const content =
      row.role === "user" ? row.content : stripLeakedToolMarkup(row.content);
    if (!content) return [];
    return [
      {
        id: row.id,
        role: row.role,
        content,
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });
  return visible;
}

installVacancyReader(async (id, locale) => {
  try {
    const job = await getJobForPublic(id, { locale });
    return job ? vacancyFromPublic(job) : null;
  } catch {
    return null;
  }
});
