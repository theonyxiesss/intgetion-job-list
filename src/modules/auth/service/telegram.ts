import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { PLACEHOLDER_EMAIL_DOMAIN } from "@/lib/supabase/admin";

/**
 * Telegram sign-in (D217). Telegram is not a Supabase provider: the user
 * confirms on oauth.telegram.org, which redirects back with the signed
 * profile in `#tgAuthResult`; the server checks the signature with the bot
 * token and then signs in a Supabase user with a placeholder email.
 */

/** Signed data older than this is refused, so a leaked payload expires. */
export const TELEGRAM_MAX_AGE_SECONDS = 60 * 60;

const telegramAuthData = z
  .object({
    id: z.number().int().positive(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    username: z.string().optional(),
    photo_url: z.string().optional(),
    auth_date: z.number().int().positive(),
    hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .loose();
export type TelegramAuthData = z.infer<typeof telegramAuthData>;

export function telegramBotToken(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  return token && /^\d+:[\w-]+$/.test(token) ? token : null;
}

/** The numeric bot id is the part of the token before the colon. */
export function telegramBotId(token: string): string {
  return token.split(":")[0]!;
}

/** Where the "Continue with Telegram" button sends the browser. */
export function telegramAuthUrl(input: {
  botId: string;
  origin: string;
  returnTo: string;
}): string {
  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("bot_id", input.botId);
  url.searchParams.set("origin", input.origin);
  url.searchParams.set("request_access", "write");
  url.searchParams.set("return_to", input.returnTo);
  return url.toString();
}

/** `#tgAuthResult=` holds base64 JSON, sometimes url-safe and unpadded. */
export function decodeTelegramResult(encoded: string): unknown {
  try {
    const base64 = encoded.replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(Buffer.from(base64, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

/**
 * Telegram's check: HMAC-SHA256 of the sorted `key=value` lines, keyed by
 * SHA-256 of the bot token. Returns the data, or null when the shape, the
 * signature or the age is wrong.
 */
export function verifyTelegramAuth(
  raw: unknown,
  botToken: string,
  now: Date = new Date(),
): TelegramAuthData | null {
  const parsed = telegramAuthData.safeParse(raw);
  if (!parsed.success) return null;
  const { hash, ...fields } = parsed.data;
  const checkString = Object.keys(fields)
    .filter((key) => fields[key] !== undefined && fields[key] !== null)
    .sort()
    .map((key) => `${key}=${String(fields[key])}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  const age = Math.floor(now.getTime() / 1000) - parsed.data.auth_date;
  if (age > TELEGRAM_MAX_AGE_SECONDS || age < -60) return null;
  return parsed.data;
}

/** Login email of a Telegram user; nothing is ever sent to it. */
export function telegramEmail(telegramId: number): string {
  return `tg${telegramId}@${PLACEHOLDER_EMAIL_DOMAIN}`;
}

/**
 * Bot sign-in (D256). The browser gets a one-time code in an httpOnly cookie
 * and opens the bot with the same code; the database keeps only its hash, so
 * a database read cannot be replayed as a sign-in.
 */
export const TELEGRAM_LOGIN_TTL_SECONDS = 10 * 60;

/** `/start` payload: letters, digits, `_` and `-`, at most 64 characters. */
const LOGIN_CODE_RE = /^[A-Za-z0-9_-]{22,43}$/;

export function newTelegramLoginCode(): string {
  return randomBytes(24).toString("base64url");
}

export function telegramLoginCodeHash(code: string): string {
  return createHash("sha256").update(`tg-login:${code}`).digest("hex");
}

/** Reads the code out of a `login_<code>` payload, or null when it is not one. */
export function parseTelegramLoginCode(payload: string): string | null {
  if (!payload.startsWith("login_")) return null;
  const code = payload.slice("login_".length);
  return LOGIN_CODE_RE.test(code) ? code : null;
}

/**
 * `/start` and its payload: returns the payload (empty string for a bare
 * `/start`), or null when the message is not a start command at all.
 */
export function parseTelegramStartCommand(text: string): string | null {
  const match = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(text.trim());
  if (!match) return null;
  return match[1] ?? "";
}

export function telegramBotStartUrl(username: string, code: string): string {
  return `https://t.me/${username}?start=login_${code}`;
}

/**
 * Secret for the `X-Telegram-Bot-Api-Secret-Token` header: derived from the
 * bot token, so it needs no separate variable and never leaves the server.
 */
export function telegramWebhookSecret(botToken: string): string {
  return createHash("sha256")
    .update(`tg-webhook:${botToken}`)
    .digest("hex")
    .slice(0, 48);
}

export function telegramWebhookSecretMatches(
  botToken: string,
  given: string | null,
): boolean {
  if (!given) return false;
  const expected = Buffer.from(telegramWebhookSecret(botToken));
  const actual = Buffer.from(given);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
