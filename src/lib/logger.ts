import pino from "pino";
import { REQUEST_ID_HEADER } from "./request-id";

/**
 * Server logs (18.1): pino JSON with a request id and no PII. Known
 * sensitive keys are censored by path; free text (error messages) goes
 * through scrubText, which masks emails, phone numbers and tokens.
 */
export function createLogger(
  destination?: pino.DestinationStream,
  level = process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "test" ? "silent" : "info"),
) {
  return destination ? pino(options(level), destination) : pino(options(level));
}

function options(level: string): pino.LoggerOptions {
  return {
    level,
    base: { service: "intgetion-job-list" },
    timestamp: pino.stdTimeFunctions.isoTime,
    redact: {
      paths: [
        "email",
        "*.email",
        "phone",
        "*.phone",
        "password",
        "*.password",
        "token",
        "*.token",
        "authorization",
        "*.authorization",
        "cookie",
        "*.cookie",
        "ip",
        "*.ip",
      ],
      censor: "[redacted]",
    },
  };
}

export const logger = createLogger();

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
// Digit runs with phone separators; masked only with 9+ digits, so dates
// (2026-10-03 has 8) and short numbers stay readable.
const PHONE = /\+?\d[\d\s().-]{6,}\d/g;
const maskPhone = (match: string) =>
  match.replace(/\D/g, "").length >= 9 ? "[phone]" : match;
const BEARER = /(bearer\s+)[A-Za-z0-9._~+/=-]+/gi;
const CONNECTION = /postgres(?:ql)?:\/\/\S+/gi;

/** Masks PII and secrets in free text before it reaches a log line. */
export function scrubText(text: string): string {
  return text
    .replace(CONNECTION, "[connection]")
    .replace(EMAIL, "[email]")
    .replace(BEARER, "$1[token]")
    .replace(PHONE, maskPhone);
}

async function currentRequestId(): Promise<string | undefined> {
  try {
    // Loaded lazily so unit tests of modules that log do not need Next.js.
    const { headers } = await import("next/headers");
    return (await headers()).get(REQUEST_ID_HEADER) ?? undefined;
  } catch {
    // Outside a request (scripts, tests).
    return undefined;
  }
}

/** Describes an error without its stack or raw values. */
export function describeError(error: unknown): Record<string, unknown> {
  if (!(error instanceof Error)) return { type: typeof error };
  const cause = error.cause as { code?: unknown } | undefined;
  return {
    type: error.name,
    message: scrubText(error.message).slice(0, 500),
    code: (error as { code?: unknown }).code ?? cause?.code,
  };
}

/**
 * Logs an unexpected server error with the request id. Fire and forget: the
 * caller is already building its response.
 */
export function reportError(error: unknown, context?: string): void {
  void (async () => {
    logger.error(
      {
        requestId: await currentRequestId(),
        context,
        err: describeError(error),
      },
      "unhandled error",
    );
  })();
}
