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
import {
  TG_WAIT_COOKIE,
  type TelegramWaitPurpose,
} from "@/lib/telegram-login-wait";

const COOKIE = "tg_login";

const copy = {
  en: {
    ask: "Sign in to INTGETION JOB LIST. If you just asked for this on intgetion.com, tap Sign in. If you did not, tap nothing.",
    button: "Sign in",
    done: "Confirmed. Go back to the browser tab with the site — sign-in finishes there.",
    expired:
      "This sign-in link expired. Press Continue with Telegram on the site again.",
    hello:
      "Ask me about work in plain words — «remote solidity jobs», «part-time design in Europe». /help explains more.\nTo sign in on the site, press Continue with Telegram there.",
  },
  ru: {
    ask: "Вход в INTGETION JOB LIST. Если это вы запросили на intgetion.com, нажмите «Войти». Если нет — ничего не нажимайте.",
    button: "Войти",
    done: "Подтверждено. Вернитесь во вкладку браузера с сайтом — вход завершится там.",
    expired:
      "Ссылка для входа устарела. Нажмите «Войти через Telegram» на сайте ещё раз.",
    hello:
      "Спросите про работу словами — «удалённая работа solidity», «дизайн на part-time в Европе». /help — подробнее.\nЧтобы войти на сайте, нажмите там «Войти через Telegram».",
  },
  es: {
    ask: "Inicia sesión en INTGETION JOB LIST. Si acabas de pedirlo en intgetion.com, pulsa «Iniciar sesión». Si no, no pulses nada.",
    button: "Iniciar sesión",
    done: "Confirmado. Vuelve a la pestaña del navegador con el sitio: el acceso se completará allí.",
    expired:
      "Este enlace de inicio de sesión ha caducado. Pulsa «Continuar con Telegram» en el sitio de nuevo.",
    hello:
      "Pregúntame por trabajo con tus palabras: «empleos remotos de solidity», «diseño a media jornada en Europa». /help explica más.\nPara iniciar sesión en el sitio, pulsa allí «Continuar con Telegram».",
  },
  "pt-BR": {
    ask: "Entrar no INTGETION JOB LIST. Se você acabou de pedir isso em intgetion.com, toque em «Entrar». Se não, não toque em nada.",
    button: "Entrar",
    done: "Confirmado. Volte à aba do navegador com o site — a entrada termina lá.",
    expired:
      "Este link de acesso expirou. Toque em «Continuar com Telegram» no site novamente.",
    hello:
      "Pergunte sobre trabalho com suas palavras — «vagas remotas de solidity», «design em meio período na Europa». /help explica mais.\nPara entrar no site, toque lá em «Continuar com Telegram».",
  },
  de: {
    ask: "Anmeldung bei INTGETION JOB LIST. Wenn Sie das gerade auf intgetion.com angefordert haben, tippen Sie auf «Anmelden». Wenn nicht, tippen Sie auf nichts.",
    button: "Anmelden",
    done: "Bestätigt. Gehen Sie zurück zum Browser-Tab mit der Website — die Anmeldung wird dort abgeschlossen.",
    expired:
      "Dieser Anmeldelink ist abgelaufen. Tippen Sie auf der Website erneut auf «Weiter mit Telegram».",
    hello:
      "Fragen Sie mich mit Ihren Worten nach Arbeit — «Remote-Jobs mit Solidity», «Design in Teilzeit in Europa». /help erklärt mehr.\nUm sich auf der Website anzumelden, tippen Sie dort auf «Weiter mit Telegram».",
  },
  fr: {
    ask: "Connexion à INTGETION JOB LIST. Si vous venez de la demander sur intgetion.com, touchez «Se connecter». Sinon, ne touchez à rien.",
    button: "Se connecter",
    done: "Confirmé. Retournez à l’onglet du navigateur avec le site — la connexion s’y termine.",
    expired:
      "Ce lien de connexion a expiré. Touchez à nouveau «Continuer avec Telegram» sur le site.",
    hello:
      "Posez-moi vos questions sur le travail avec vos mots — «emplois Solidity à distance», «design à temps partiel en Europe». /help en dit plus.\nPour vous connecter au site, touchez-y «Continuer avec Telegram».",
  },
  it: {
    ask: "Accesso a INTGETION JOB LIST. Se l’hai appena richiesto su intgetion.com, tocca «Accedi». Altrimenti non toccare nulla.",
    button: "Accedi",
    done: "Confermato. Torna alla scheda del browser con il sito: l’accesso si completa lì.",
    expired:
      "Questo link di accesso è scaduto. Tocca di nuovo «Continua con Telegram» sul sito.",
    hello:
      "Chiedimi del lavoro con parole tue — «lavori Solidity da remoto», «design part-time in Europa». /help spiega di più.\nPer accedere al sito, tocca lì «Continua con Telegram».",
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

/** Visible to the page so any tab can resume. The code itself stays httpOnly. */
function waitCookieOptions(maxAge: number) {
  return {
    httpOnly: false,
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
    username: from.username?.slice(0, 32) || null,
    firstName: from.first_name?.slice(0, 64) ?? null,
  };
}

function telegramIdNumber(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return id;
}

function clearLoginCookies(jar: Awaited<ReturnType<typeof cookies>>): void {
  jar.set(COOKIE, "", cookieOptions(0));
  jar.set(TG_WAIT_COOKIE, "", waitCookieOptions(0));
}

/**
 * Creates a one-time link that opens the bot. The code is stored only as a hash.
 * A second tap in the same browser reuses the live code, so the phone does not
 * get two buttons for two different codes (D426).
 */
export async function beginTelegramBotLogin(
  locale: AppLocale,
  purpose: TelegramWaitPurpose = "signin",
): Promise<{ url: string }> {
  const token = telegramBotToken();
  if (!token || !authAdminAvailable()) throw disabled();
  await ensureTelegramWebhook(token);
  const username = await telegramBotUsername(token);
  const now = new Date();
  await challenges.deleteExpiredTelegramLogins(now);
  const jar = await cookies();
  const existingCode = jar.get(COOKIE)?.value ?? "";
  if (parseTelegramLoginCode(`login_${existingCode}`)) {
    const existing = await challenges.findTelegramLoginChallenge(
      telegramLoginCodeHash(existingCode),
    );
    if (
      existing &&
      !existing.confirmedAt &&
      existing.expiresAt.getTime() > now.getTime()
    ) {
      const remaining = Math.max(
        1,
        Math.floor((existing.expiresAt.getTime() - now.getTime()) / 1000),
      );
      jar.set(COOKIE, existingCode, cookieOptions(remaining));
      jar.set(TG_WAIT_COOKIE, purpose, waitCookieOptions(remaining));
      return { url: telegramBotStartUrl(username, existingCode) };
    }
  }
  const code = newTelegramLoginCode();
  await challenges.insertTelegramLoginChallenge({
    codeHash: telegramLoginCodeHash(code),
    locale,
    expiresAt: new Date(now.getTime() + TELEGRAM_LOGIN_TTL_SECONDS * 1000),
  });
  jar.set(COOKIE, code, cookieOptions(TELEGRAM_LOGIN_TTL_SECONDS));
  jar.set(
    TG_WAIT_COOKIE,
    purpose,
    waitCookieOptions(TELEGRAM_LOGIN_TTL_SECONDS),
  );
  return { url: telegramBotStartUrl(username, code) };
}

export type TelegramPoll = "signed-in" | "pending" | "absent";

/** Signs in when the bot tap has confirmed the cookie's challenge. */
export async function finishTelegramBotLogin(
  auth: AuthClient,
): Promise<TelegramPoll> {
  const jar = await cookies();
  const code = jar.get(COOKIE)?.value ?? "";
  if (!parseTelegramLoginCode(`login_${code}`)) {
    if (jar.get(TG_WAIT_COOKIE)) clearLoginCookies(jar);
    return "absent";
  }
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  const now = new Date();
  if (!row || row.expiresAt.getTime() <= now.getTime()) {
    if (row) await challenges.deleteTelegramLoginChallenge(row.codeHash);
    clearLoginCookies(jar);
    return "absent";
  }
  if (!row.confirmedAt) return "pending";
  const id = telegramIdNumber(row.telegramId);
  if (!id) {
    clearLoginCookies(jar);
    return "absent";
  }
  await signInWithTelegramProfile(
    auth,
    { id, username: row.username || null },
    localeOf(row.locale),
    now,
  );
  await challenges.deleteTelegramLoginChallenge(row.codeHash);
  clearLoginCookies(jar);
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
  if (!parseTelegramLoginCode(`login_${code}`)) {
    if (jar.get(TG_WAIT_COOKIE)) clearLoginCookies(jar);
    return "absent";
  }
  const row = await challenges.findTelegramLoginChallenge(
    telegramLoginCodeHash(code),
  );
  if (!row || row.expiresAt.getTime() <= Date.now()) {
    if (row) await challenges.deleteTelegramLoginChallenge(row.codeHash);
    clearLoginCookies(jar);
    return "absent";
  }
  if (!row.confirmedAt) return "pending";
  const id = telegramIdNumber(row.telegramId);
  if (!id) {
    clearLoginCookies(jar);
    return "absent";
  }
  try {
    await linkTelegramProfile(user, { id, username: row.username || null });
  } finally {
    await challenges.deleteTelegramLoginChallenge(row.codeHash);
    clearLoginCookies(jar);
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
    // A second tap, or Telegram delivering the same tap again, must not send
    // another copy of the same line (D426).
    if (outcome === "already") return true;
    const locale = await challengeLocale(code);
    const text = copy[locale];
    await reply(
      token,
      chatId,
      outcome === "confirmed" ? text.done : text.expired,
    );
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
  const claimed = await challenges.claimTelegramLoginPrompt(
    telegramLoginCodeHash(code),
    new Date(),
  );
  if (!claimed) return true;
  try {
    await reply(token, message.chat?.id, lines.ask, {
      label: lines.button,
      data: payload,
    });
  } catch (error) {
    await challenges.releaseTelegramLoginPrompt(telegramLoginCodeHash(code));
    throw error;
  }
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
