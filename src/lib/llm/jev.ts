/**
 * Jev, TypeSafe AI's decision model (TZ 36, C4), through the OpenRouter
 * Decisions API: a state plus typed questions in, probabilities out, no text.
 * Only yes/no (`noul`) questions are used here. The key is the same
 * OpenRouter key; the cost comes back in `usage.cost` and is the caller's to
 * cap. Pricing checked 2026-10-27: $0.042 per 1M input tokens, output free.
 */

const API_URL = "https://openrouter.ai/api/alpha/decisions";
const TIMEOUT_MS = 15_000;

export const JEV_MODEL = "typesafe/jev-1.14";

export type JevNoulQuestion = {
  type: "noul";
  instructions: string;
  criteria: { true: string; false: string };
};

export type JevNoulResult = {
  /** Question name → probability of "yes", 0 to 1. */
  answers: Record<string, number>;
  costUsd: number;
  inputTokens: number;
  model: string;
};

export class JevError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "JevError";
  }
}

export async function askJevNouls(input: {
  apiKey: string;
  state: unknown;
  questions: Record<string, JevNoulQuestion>;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<JevNoulResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await fetchImpl(API_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${input.apiKey}`,
        "content-type": "application/json",
        "x-title": "INTGETION JOB LIST",
      },
      body: JSON.stringify({
        model: input.model ?? JEV_MODEL,
        state: input.state,
        questions: input.questions,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new JevError("Jev did not answer");
  }
  if (!response.ok) {
    throw new JevError(`Jev answered ${response.status}`, response.status);
  }
  let body: {
    model?: unknown;
    answers?: Record<string, { noul?: unknown }>;
    usage?: { input_tokens?: unknown; cost?: unknown };
  };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new JevError("Jev did not answer");
  }
  const answers: Record<string, number> = {};
  for (const name of Object.keys(input.questions)) {
    const value = body.answers?.[name]?.noul;
    if (typeof value !== "number" || value < 0 || value > 1) {
      throw new JevError(`Jev gave no answer for ${name}`);
    }
    answers[name] = value;
  }
  return {
    answers,
    costUsd: typeof body.usage?.cost === "number" ? body.usage.cost : 0,
    inputTokens:
      typeof body.usage?.input_tokens === "number"
        ? body.usage.input_tokens
        : 0,
    model: typeof body.model === "string" ? body.model : "",
  };
}
