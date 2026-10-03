/**
 * Token and money budgets of 12.5. Money is integer micro-USD (bigint);
 * prices are parameters, never constants here.
 */

export const MAX_OUTPUT_TOKENS = 800;
export const MAX_INPUT_TOKENS = 6000;
export const MAX_HISTORY_MESSAGES = 12;
/** Per-message framing (role markers, separators) in the estimate. */
export const MESSAGE_OVERHEAD_TOKENS = 4;

const encoder = new TextEncoder();

/**
 * Upper estimate without a tokenizer (D85): UTF-8 bytes / 3, rounded up.
 * English averages ~4 bytes per token and Cyrillic (2 bytes per letter)
 * ~5–6 bytes per token, so bytes / 3 over-counts both — the budget errs on
 * the safe side.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(encoder.encode(text).length / 3);
}

export type PriceTable = Record<
  string,
  { inputMicroUsdPerMTok: bigint; outputMicroUsdPerMTok: bigint }
>;

const MILLION = BigInt(1_000_000);

function toBigTokens(value: number, name: string): bigint {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return BigInt(value);
}

/** Cost in micro-USD, rounded up; an unknown model is an error. */
export function costMicroUsd(
  model: string,
  usage: { tokensIn: number; tokensOut: number },
  prices: PriceTable,
): bigint {
  const price = prices[model];
  if (!price) throw new Error(`No price for model ${model}`);
  const total =
    toBigTokens(usage.tokensIn, "tokensIn") * price.inputMicroUsdPerMTok +
    toBigTokens(usage.tokensOut, "tokensOut") * price.outputMicroUsdPerMTok;
  return (total + MILLION - BigInt(1)) / MILLION;
}

/** "12.50" USD → 12 500 000 micro-USD, exactly (no float). */
export function parseUsdToMicro(value: string): bigint {
  const match = /^\s*(\d{1,12})(?:\.(\d{1,6}))?\s*$/.exec(value);
  if (!match) throw new Error(`Invalid USD amount: ${JSON.stringify(value)}`);
  const whole = BigInt(match[1]!);
  const fraction = BigInt((match[2] ?? "").padEnd(6, "0"));
  return whole * MILLION + fraction;
}

export type ContextMessage = { role: string; content: string };

/**
 * Keeps the newest messages that fit: at most 12, and at most 6 000
 * estimated input tokens together with the system prompt and summary. The
 * dropped ones go into the conversation summary (caller).
 */
export function trimContext<T extends ContextMessage>(input: {
  system: string;
  summary?: string;
  messages: readonly T[];
  maxInputTokens?: number;
}): { messages: T[]; dropped: T[]; estimatedTokens: number } {
  const limit = input.maxInputTokens ?? MAX_INPUT_TOKENS;
  let used =
    estimateTokens(input.system) +
    (input.summary
      ? estimateTokens(input.summary) + MESSAGE_OVERHEAD_TOKENS
      : 0);
  if (used > limit) {
    throw new RangeError("System prompt and summary exceed the input budget");
  }
  const recent = input.messages.slice(-MAX_HISTORY_MESSAGES);
  const kept: T[] = [];
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const message = recent[i]!;
    const cost = estimateTokens(message.content) + MESSAGE_OVERHEAD_TOKENS;
    if (used + cost > limit) break;
    used += cost;
    kept.unshift(message);
  }
  const dropped = input.messages.slice(0, input.messages.length - kept.length);
  return { messages: kept, dropped, estimatedTokens: used };
}

/**
 * Circuit breaker: once today's total cost is above `LLM_DAILY_BUDGET_USD`,
 * the bot answers with a polite refusal and offers the normal search.
 * Without a configured budget the breaker stays closed.
 */
export function circuitBreakerOpen(
  spentTodayMicroUsd: bigint,
  dailyBudgetUsd: string | undefined,
): boolean {
  if (!dailyBudgetUsd?.trim()) return false;
  return spentTodayMicroUsd > parseUsdToMicro(dailyBudgetUsd);
}

/** Integer median; for an even count the lower middle average, rounded down. */
export function medianMicroUsd(values: readonly bigint[]): bigint | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / BigInt(2);
}

/** Fewer past days than this is too little history to call anything odd. */
export const ANOMALY_MIN_HISTORY_DAYS = 3;

/**
 * 12.5: today's cost of a user above 3× the median of their past daily
 * costs → alert and the guest limit of 30 messages.
 */
export function isCostAnomaly(
  todayMicroUsd: bigint,
  pastDailyMicroUsd: readonly bigint[],
): boolean {
  if (pastDailyMicroUsd.length < ANOMALY_MIN_HISTORY_DAYS) return false;
  const median = medianMicroUsd(pastDailyMicroUsd)!;
  return todayMicroUsd > BigInt(3) * median;
}
