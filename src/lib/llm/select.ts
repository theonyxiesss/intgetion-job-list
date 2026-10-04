import { AnthropicProvider, pricesFromEnv } from "./anthropic";
import type { PriceTable } from "./budget";
import { isFreeModel, OpenRouterProvider } from "./openrouter";
import type { LLMModels, LLMProvider } from "./provider";

/**
 * Picks the LLM backend from the environment (D213):
 * - `LLM_PROVIDER=openrouter` + `OPENROUTER_API_KEY`: OpenRouter, free models
 *   (`…:free`) need no price — they cost 0 and the per-user limits still hold;
 * - otherwise Anthropic + `ANTHROPIC_API_KEY` (D171).
 * A paid model without a price in `LLM_PRICES_MICRO_USD` is not configured:
 * the budget breaker could not count it.
 */

export type ProviderName = "anthropic" | "openrouter";

export const OPENROUTER_DEFAULT_MODELS: LLMModels = {
  chat: "qwen/qwen3.8-27b:free",
  extract: "qwen/qwen3.8-27b:free",
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
  return env.LLM_PROVIDER?.trim().toLowerCase() === "openrouter"
    ? "openrouter"
    : "anthropic";
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
