import { AnthropicProvider, pricesFromEnv } from "./anthropic";
import type { PriceTable } from "./budget";
import { isFreeModel, OpenRouterProvider } from "./openrouter";
import type { LLMModels, LLMProvider } from "./provider";

/**
 * Picks the LLM backend from the environment (D213, D317):
 * - by default OpenRouter + `OPENROUTER_API_KEY` on free models (`…:free`),
 *   which need no price — they cost 0 and the per-user limits still hold;
 * - `LLM_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` switches to Anthropic
 *   (D171), where a model without a price in `LLM_PRICES_MICRO_USD` is not
 *   configured at all: the budget breaker could not count it.
 */

export type ProviderName = "anthropic" | "openrouter";

/**
 * Free models that exist and accept tool calls, checked against
 * `https://openrouter.ai/api/v1/models` on 2026-10-06: of 16 free models 15
 * accept tools, and these two also report a price of zero. The chat model
 * answers with our tools, so `tools` support is not optional; the smaller one
 * is kept for extraction. Both can be replaced from the environment when
 * OpenRouter retires them — it does that often, which is why the list above
 * is worth re-reading before changing these.
 */
export const OPENROUTER_DEFAULT_MODELS: LLMModels = {
  chat: "nvidia/nemotron-3-super-120b-a12b:free",
  extract: "google/gemma-4-26b-a4b-it:free",
};
const ANTHROPIC_DEFAULT_MODELS: LLMModels = {
  chat: "claude-sonnet-5-5",
  extract: "claude-haiku-4-5-20251001",
};

export type LLMSetup = {
  name: ProviderName;
  provider: LLMProvider;
  models: LLMModels;
  prices: PriceTable;
};

export function providerName(
  env: Record<string, string | undefined> = process.env,
): ProviderName {
  // OpenRouter unless asked otherwise: the project runs on free models (D317).
  return env.LLM_PROVIDER?.trim().toLowerCase() === "anthropic"
    ? "anthropic"
    : "openrouter";
}

export function modelsFor(
  name: ProviderName,
  env: Record<string, string | undefined> = process.env,
): LLMModels {
  const defaults =
    name === "openrouter"
      ? OPENROUTER_DEFAULT_MODELS
      : ANTHROPIC_DEFAULT_MODELS;
  return {
    chat: env.LLM_MODEL_CHAT?.trim() || defaults.chat,
    extract: env.LLM_MODEL_EXTRACT?.trim() || defaults.extract,
  };
}

/** Free models get a zero price so the budget breaker can still count. */
export function pricesFor(
  models: LLMModels,
  env: Record<string, string | undefined> = process.env,
): PriceTable {
  const prices: PriceTable = { ...pricesFromEnv(env) };
  for (const model of [models.chat, models.extract]) {
    if (isFreeModel(model) && !prices[model]) {
      prices[model] = {
        inputMicroUsdPerMTok: BigInt(0),
        outputMicroUsdPerMTok: BigInt(0),
      };
    }
  }
  return prices;
}

export function llmFromEnv(
  env: Record<string, string | undefined> = process.env,
): LLMSetup | null {
  const name = providerName(env);
  const models = modelsFor(name, env);
  const prices = pricesFor(models, env);
  if (!prices[models.chat]) return null;
  if (name === "openrouter") {
    const key = env.OPENROUTER_API_KEY?.trim();
    if (!key) return null;
    return {
      name,
      provider: new OpenRouterProvider(key, env.NEXT_PUBLIC_SITE_URL?.trim()),
      models,
      prices,
    };
  }
  const key = env.ANTHROPIC_API_KEY?.trim();
  if (!key) return null;
  return { name, provider: new AnthropicProvider(key), models, prices };
}
