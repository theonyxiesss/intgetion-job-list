import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { authAdminAvailable } from "@/lib/supabase/admin";
import type { AuthClient } from "./auth-service";
import { signInWithTelegramProfile } from "./auth-service";
import {
  answerTelegramCallback,
  ensureTelegramWebhook,
  sendTelegramMessage,
  telegramBotUsername,
} from "./telegram-bot";
import {
  newTelegramLoginCode,
  parseTelegramLoginCode,
  parseTelegramStartCommand,
  telegramBotStartUrl,
  telegramBotToken,
  telegramLoginCodeHash,
  TELEGRAM_LOGIN_TTL_SECONDS,
} from "./telegram";
import * as challenges from "../repo/telegram-login";

const COOKIE = "tg_login";

const copy = {
  en: {
    ask: "Sign in to INTGETION JOB LIST. If you just asked for this on intgetion.com, tap Sign in. If you did not, tap nothing.",
    button: "Sign in",
    done: "Done. Go back to the site — you are signed in.",
    expired:
      "This sign-in link expired. Press Continue with Telegram on the site again.",
    hello:
      "To sign in, open intgetion.com and press Continue with Telegram.\nЧтобы войти, откройте intgetion.com и нажмите «Войти через Telegram».",
  },
  ru: {
    ask: "Вход в INTGETION JOB LIST. Если это вы запросили на intgetion.com, нажмите «Войти». Если нет — ничего не нажимайте.",
    button: "Войти",
    done: "Готово. Вернитесь на сайт — вход уже открыт.",
    expired:
      "Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.",
    hello:
      "To sign in, open intgetion.com and press Continue with Telegram.\nЧтобы войти, откройте intgetion.com и нажмите «Войти через Telegram».",
  },
} as const;

function disabled(): HttpError {
  return new HttpError(503, "TELEGRAM_DISABLED", "Telegram is not set up");
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function localeOf(value: string): AppLocale {
  return value === "ru" ? "ru" : "en";
}

function profileFrom(from: {
  id: number;
  username?: string;
  first_name?: string;
}): { telegramId: string; username: string | null; firstName: string | null } {
  return {
    telegramId: String(from.id),
    username: from.username?.slice(0, 32) ?? null,
    firstName: from.first_name?.slice(0, 64) ?? null,
  };
}

function telegramIdNumber(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

/** Creates a one-time link that opens the bot. The code is stored only as a hash. */
export async function beginTelegramBotLogin(
  locale: AppLocale,
): Promise<{ url: string }> {
  const token = telegramBotToken();
  if (!token || !authAdminAvailable()) throw disabled();
  await ensureTelegramWebhook(token);
  const username = await telegramBotUsername(token);
  const code = newTelegramLoginCode();
  const now = new Date();
  await challenges.deleteExpiredTelegramLogins(now);
  await challenges.insertTelegramLoginChallenge({
    codeHash: telegramLoginCodeHash(code),
    locale,
    expiresAt: new Date(now.getTime() + TELEGRAM_LOGIN_TTL_SECONDS * 1000),
  });
  const jar = await cookies();
  jar.set(COOKIE, code, cookieOptions(TELEGRAM_LOGIN_TTL_SECONDS));
  return { url: telegramBotStartUrl(username, code) };
}

export type TelegramPoll = "signed-in" | "pending" | "absent";

/** Signs in when the bot tap has confirmed the cookie's challenge. */
export async function finishTelegramBotLogin(
  auth: AuthClient,
): Promise<TelegramPoll> {
  const jar = await cookies();
  const code = jar.get(COOKIE)?.value ?? "";
  if (!parseTelegramLoginCode(`login_${code}`)) return "absent";
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  const now = new Date();
  if (!row || row.expiresAt.getTime() <= now.getTime()) {
    if (row) await challenges.deleteTelegramLoginChallenge(row.codeHash);
    jar.set(COOKIE, "", cookieOptions(0));
    return "absent";
  }
  if (!row.confirmedAt) return "pending";
  const id = telegramIdNumber(row.telegramId);
  if (!id) return "absent";
  await signInWithTelegramProfile(
    auth,
    { id, username: row.username },
    localeOf(row.locale),
    now,
  );
  await challenges.deleteTelegramLoginChallenge(row.codeHash);
  jar.set(COOKIE, "", cookieOptions(0));
  return "signed-in";
}

type TelegramFrom = {
  id: number;
  is_bot?: boolean;
  username?: string;
  first_name?: string;
};

type TelegramUpdate = {
  message?: { text?: string; chat?: { id?: number }; from?: TelegramFrom };
  callback_query?: {
    id?: string;
    data?: string;
    from?: TelegramFrom;
    message?: { chat?: { id?: number } };
  };
};

async function reply(
  token: string,
  chatId: number | undefined,
  text: string,
  button?: { label: string; data: string },
): Promise<void> {
  if (!chatId) return;
  await sendTelegramMessage(token, chatId, text, button);
}

/**
 * Bot update (D219). Trust comes from the webhook secret checked by the route,
 * not from anything the browser sends.
 */
export async function handleTelegramWebhook(
  token: string,
  raw: unknown,
): Promise<void> {
  const update = (raw ?? {}) as TelegramUpdate;
  const callback = update.callback_query;
  if (
    callback?.id &&
    callback.from &&
    !callback.from.is_bot &&
    typeof callback.from.id === "number"
  ) {
    await answerTelegramCallback(token, callback.id).catch((error: unknown) => {
      logger.error(
        { err: errorName(error) },
        "telegram callback answer failed",
      );
    });
    const code = callback.data ? parseTelegramLoginCode(callback.data) : null;
    const chatId = callback.message?.chat?.id;
    if (!code) return;
    const outcome = await confirmCode(code, callback.from);
    const locale = await challengeLocale(code);
    const text = copy[locale];
    if (outcome === "confirmed" || outcome === "already") {
      await reply(token, chatId, text.done);
    } else {
      await reply(token, chatId, text.expired);
    }
    return;
  }

  const message = update.message;
  if (!message?.text || !message.from || message.from.is_bot) return;
  if (typeof message.chat?.id !== "number") return;
  const payload = parseTelegramStartCommand(message.text);
  if (payload === null) return;
  const text = copy.en;
  if (!payload) {
    await reply(token, message.chat?.id, text.hello);
    return;
  }
  const code = parseTelegramLoginCode(payload);
  if (!code) {
    await reply(token, message.chat?.id, text.hello);
    return;
  }
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  const locale = localeOf(row?.locale ?? "en");
  const lines = copy[locale];
  if (!row || row.expiresAt.getTime() <= Date.now() || row.confirmedAt) {
    await reply(
      token,
      message.chat?.id,
      row?.confirmedAt ? lines.done : lines.expired,
    );
    return;
  }
  await reply(token, message.chat?.id, lines.ask, {
    label: lines.button,
    data: payload,
  });
}

async function confirmCode(
  code: string,
  from: TelegramFrom,
): Promise<"confirmed" | "already" | "expired"> {
  const hash = telegramLoginCodeHash(code);
  const now = new Date();
  const updated = await challenges.confirmTelegramLoginChallenge(
    hash,
    profileFrom(from),
    now,
  );
  if (updated) return "confirmed";
  const existing = await challenges.findTelegramLoginChallenge(hash);
  if (existing?.confirmedAt) return "already";
  return "expired";
}

async function challengeLocale(code: string): Promise<AppLocale> {
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  return localeOf(row?.locale ?? "en");
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Error";
}
