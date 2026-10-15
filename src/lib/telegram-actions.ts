import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed inline buttons for a freelance request in Telegram (D456).
 * `callback_data` is capped at 64 bytes by Telegram, so the token is
 * `fr<step><action>.<orderId>.<expiry, unix minutes base36>.<14 chars of
 * HMAC>`; 62 bytes for a uuid. Past the expiry the button reads as null.
 */

export type TelegramOrderAction = "accept" | "decline";
/** 1 asks again, 2 does it: the second tap guards against a stray touch. */
export type TelegramActionStep = 1 | 2;

/** A request expires after 72 hours (D447); its buttons last as long. */
export const TELEGRAM_ACTION_TTL_MS: Record<TelegramActionStep, number> = {
  1: 72 * 60 * 60 * 1000,
  2: 60 * 60 * 1000,
};

const CODES: Record<TelegramOrderAction, string> = {
  accept: "a",
  decline: "d",
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNATURE_LENGTH = 14;

/** Derived from the bot token, like the webhook secret: no extra variable. */
export function telegramActionSecret(botToken: string): string {
  return createHash("sha256").update(`tg-action:${botToken}`).digest("hex");
}

function signature(
  secret: string,
  head: string,
  orderId: string,
  expiry: string,
): string {
  return createHmac("sha256", secret)
    .update(`freelance-order.${head}.${orderId.toLowerCase()}.${expiry}`)
    .digest("base64url")
    .slice(0, SIGNATURE_LENGTH);
}

export function signTelegramAction(
  secret: string,
  step: TelegramActionStep,
  action: TelegramOrderAction,
  orderId: string,
  now: Date = new Date(),
): string {
  const head = `fr${step}${CODES[action]}`;
  const expiry = Math.ceil(
    (now.getTime() + TELEGRAM_ACTION_TTL_MS[step]) / 60_000,
  ).toString(36);
  return `${head}.${orderId}.${expiry}.${signature(secret, head, orderId, expiry)}`;
}

/** True for any data this feature owns, valid or not. */
export function isTelegramOrderAction(data: unknown): boolean {
  return typeof data === "string" && /^fr[12][ad]\./.test(data);
}

/** The action, or null for forged, expired, foreign or malformed data. */
export function readTelegramAction(
  secret: string,
  data: string,
  now: Date = new Date(),
): {
  step: TelegramActionStep;
  action: TelegramOrderAction;
  orderId: string;
} | null {
  if (!secret) return null;
  const match = /^(fr([12])([ad]))\.([^.]+)\.([0-9a-z]{1,8})\.([^.]+)$/.exec(
    data,
  );
  if (!match) return null;
  const [, head, step, code, orderId, expiry, given] = match;
  if (!head || !orderId || !expiry || !given || !UUID.test(orderId)) {
    return null;
  }
  const expected = Buffer.from(signature(secret, head, orderId, expiry));
  const actual = Buffer.from(given);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }
  if (parseInt(expiry, 36) * 60_000 < now.getTime()) return null;
  return {
    step: step === "1" ? 1 : 2,
    action: code === "a" ? "accept" : "decline",
    orderId: orderId.toLowerCase(),
  };
}
