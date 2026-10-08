import { cookies } from "next/headers";
import type { AppLocale } from "@/i18n/routing";
import { HttpError } from "@/lib/http";
import { logger } from "@/lib/logger";
import { authAdminAvailable } from "@/lib/supabase/admin";
import {
  linkTelegramProfile,
  signInWithTelegramProfile,
  type AuthClient,
  type CurrentUser,
} from "./auth-service";
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
import { toAppLocale } from "@/i18n/locale";

const COOKIE = "tg_login";

const copy = {
  en: {
    ask: "Sign in to INTGETION JOB LIST. If you just asked for this on intgetion.com, tap Sign in. If you did not, tap nothing.",
    button: "Sign in",
    done: "Done. Go back to the site — you are signed in.",
    expired:
      "This sign-in link expired. Press Continue with Telegram on the site again.",
    hello:
      "Ask me about work in plain words — «remote solidity jobs», «part-time design in Europe». /help explains more.\nTo sign in on the site, press Continue with Telegram there.",
  },
  ru: {
    ask: "Вход в INTGETION JOB LIST. Если это вы запросили на intgetion.com, нажмите «Войти». Если нет — ничего не нажимайте.",
    button: "Войти",
    done: "Готово. Вернитесь на сайт — вход уже открыт.",
    expired:
      "Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.",
    hello:
      "Спросите про работу словами — «удалённая работа solidity», «дизайн на part-time в Европе». /help — подробнее.\nЧтобы войти на сайте, нажмите там «Войти через Telegram».",
  },
  es: {
    ask: "Inicia sesión en INTGETION JOB LIST. Si acabas de pedirlo en intgetion.com, pulsa «Iniciar sesión». Si no, no pulses nada.",
    button: "Iniciar sesión",
    done: "Listo. Vuelve al sitio: ya has iniciado sesión.",
    expired:
      "Este enlace de inicio de sesión ha caducado. Pulsa «Continuar con Telegram» en el sitio de nuevo.",
    hello:
      "Pregúntame por trabajo con tus palabras: «empleos remotos de solidity», «diseño a media jornada en Europa». /help explica más.\nPara iniciar sesión en el sitio, pulsa allí «Continuar con Telegram».",
  },
  "pt-BR": {
    ask: "Entrar no INTGETION JOB LIST. Se você acabou de pedir isso em intgetion.com, toque em «Entrar». Se não, não toque em nada.",
    button: "Entrar",
    done: "Pronto. Volte ao site — você já está conectado.",
    expired:
      "Este link de acesso expirou. Toque em «Continuar com Telegram» no site novamente.",
    hello:
      "Pergunte sobre trabalho com suas palavras — «vagas remotas de solidity», «design em meio período na Europa». /help explica mais.\nPara entrar no site, toque lá em «Continuar com Telegram».",
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
  return toAppLocale(value);
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

/**
 * Links the confirmed bot tap to the signed-in account (D339).
 * Does not open a new session.
 */
export async function finishTelegramBotLink(
  user: CurrentUser,
): Promise<TelegramPoll> {
  const jar = await cookies();
  const code = jar.get(COOKIE)?.value ?? "";
  if (!parseTelegramLoginCode(`login_${code}`)) return "absent";
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (row) await challenges.deleteTelegramLoginChallenge(row.codeHash);
    jar.set(COOKIE, "", cookieOptions(0));
    return "absent";
  }
  if (!row.confirmedAt) return "pending";
  const id = telegramIdNumber(row.telegramId);
  if (!id) return "absent";
  try {
    await linkTelegramProfile(user, { id, username: row.username });
  } finally {
    await challenges.deleteTelegramLoginChallenge(row.codeHash);
    jar.set(COOKIE, "", cookieOptions(0));
  }
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
 * Bot update (D256). Trust comes from the webhook secret checked by the route,
 * not from anything the browser sends.
 *
 * Returns true when the update was a sign-in step. Anything else — ordinary
 * chat with the bot — is left to the caller to route to the agent (D311).
 */
export async function handleTelegramWebhook(
  token: string,
  raw: unknown,
): Promise<boolean> {
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
    if (!code) return true;
    const outcome = await confirmCode(code, callback.from);
    const locale = await challengeLocale(code);
    const text = copy[locale];
    if (outcome === "confirmed" || outcome === "already") {
      await reply(token, chatId, text.done);
    } else {
      await reply(token, chatId, text.expired);
    }
    return true;
  }

  const message = update.message;
  if (!message?.text || !message.from || message.from.is_bot) return false;
  if (typeof message.chat?.id !== "number") return false;
  const payload = parseTelegramStartCommand(message.text);
  // Not a /start command at all: ordinary chat, which the agent answers.
  if (payload === null) return false;
  const text = copy.en;
  if (!payload) {
    await reply(token, message.chat?.id, text.hello);
    return true;
  }
  const code = parseTelegramLoginCode(payload);
  if (!code) {
    await reply(token, message.chat?.id, text.hello);
    return true;
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
    return true;
  }
  await reply(token, message.chat?.id, lines.ask, {
    label: lines.button,
    data: payload,
  });
  return true;
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
