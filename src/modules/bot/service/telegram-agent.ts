import { createHmac } from "node:crypto";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/supabase/env";
import {
  sendTelegramChatAction,
  sendTelegramMessage,
  userIdForTelegramId,
} from "@/modules/auth/service";
import {
  handleMessage,
  resolveConversation,
  type BotEvent,
} from "./conversation";
import { localePrefix } from "@/i18n/paths";

/** One Telegram message is 4096 characters; leave room for the job list. */
const TELEGRAM_TEXT_LIMIT = 3500;
const MAX_JOBS_IN_REPLY = 5;

type TelegramChatMessage = {
  text?: string;
  from?: { id?: number; is_bot?: boolean; language_code?: string };
  chat?: { id?: number };
};

export type TelegramAgentUpdate = { message?: TelegramChatMessage };

const copy = {
  en: {
    unavailable:
      "The agent is resting right now. The catalogue still works: " +
      "{site}/en/jobs",
    tryLater: "Something went wrong on my side. Try again in a minute.",
    rateLimited: "That is a lot of questions at once. Try again in a minute.",
    budget: "The agent has reached its budget for today. Try again tomorrow.",
    empty: "Ask me what you are looking for — a role, a skill, a time zone.",
    reset: "Forgotten. What are you looking for?",
    help:
      "Ask in plain words: «remote solidity jobs», «part-time design in Europe». " +
      "Sign in on {site} to save jobs and apply. /reset starts a new conversation.",
    signIn:
      "To save a job or apply, sign in: {site}/en/login — then come back here.",
    more: "More in the catalogue: {site}/en/jobs",
  },
  ru: {
    unavailable: "Агент сейчас недоступен. Каталог работает: {site}/ru/jobs",
    tryLater: "У меня что-то сломалось. Попробуйте через минуту.",
    rateLimited: "Слишком много вопросов подряд. Попробуйте через минуту.",
    budget: "Агент исчерпал бюджет на сегодня. Попробуйте завтра.",
    empty: "Напишите, что ищете: роль, навык, часовой пояс.",
    reset: "Забыл. Что ищете?",
    help:
      "Пишите словами: «удалённая работа solidity», «дизайн на part-time в Европе». " +
      "Войдите на {site}, чтобы сохранять вакансии и откликаться. /reset — начать заново.",
    signIn:
      "Чтобы сохранить вакансию или откликнуться, войдите: {site}/ru/login — и возвращайтесь сюда.",
    more: "Ещё в каталоге: {site}/ru/jobs",
  },
  "pt-BR": {
    unavailable:
      "O agente está descansando agora. O catálogo continua funcionando: " +
      "{site}/pt-BR/jobs",
    tryLater: "Algo deu errado do meu lado. Tente novamente em um minuto.",
    rateLimited:
      "São muitas perguntas de uma vez. Tente novamente em um minuto.",
    budget: "O agente atingiu o orçamento de hoje. Tente novamente amanhã.",
    empty:
      "Diga o que você procura — um cargo, uma habilidade, um fuso horário.",
    reset: "Esquecido. O que você procura?",
    help:
      "Pergunte com suas palavras: «vagas remotas de solidity», «design em meio período na Europa». " +
      "Entre em {site} para salvar vagas e se candidatar. /reset começa uma nova conversa.",
    signIn:
      "Para salvar uma vaga ou se candidatar, entre: {site}/pt-BR/login — e depois volte aqui.",
    more: "Mais no catálogo: {site}/pt-BR/jobs",
  },
} as const;

type Lines = { readonly [K in keyof (typeof copy)["en"]]: string };

function linesFor(languageCode: string | undefined): {
  lines: Lines;
  locale: string;
} {
  const code = (languageCode ?? "").toLowerCase();
  // D350: Telegram sends "pt" or "pt-br"; both get Brazilian Portuguese.
  if (code.startsWith("pt")) return { lines: copy["pt-BR"], locale: "pt-BR" };
  const ru = code.startsWith("ru");
  return { lines: ru ? copy.ru : copy.en, locale: ru ? "ru" : "en" };
}

function fill(line: string): string {
  return line.replace("{site}", siteUrl());
}

/**
 * The conversation of one Telegram chat, derived rather than stored: the same
 * chat always yields the same session token, so the agent remembers the thread
 * without a table of its own. The secret keeps a chat id from being guessable.
 */
function chatSessionToken(chatId: number): string {
  const secret = process.env.PRIVACY_HASH_SECRET ?? "";
  return createHmac("sha256", secret).update(`tg:${chatId}`).digest("hex");
}

/** A fresh thread for /reset: the salt changes the derived token. */
function resetSessionToken(chatId: number, now: Date): string {
  const secret = process.env.PRIVACY_HASH_SECRET ?? "";
  return createHmac("sha256", secret)
    .update(`tg:${chatId}:${now.toISOString().slice(0, 16)}`)
    .digest("hex");
}

const resets = new Map<number, string>();

/** Collects the turn's events into the text and the cards Telegram can show. */
function render(events: BotEvent[], lines: Lines, locale: string): string[] {
  const out: string[] = [];
  let answer = "";
  for (const event of events) {
    if (
      event.type === "token" ||
      event.type === "resume_ack" ||
      event.type === "signup_hint" ||
      event.type === "profile_saved"
    ) {
      answer += event.text;
    }
  }
  if (answer.trim()) out.push(answer.trim().slice(0, TELEGRAM_TEXT_LIMIT));

  for (const event of events) {
    if (event.type !== "tool_result") continue;
    if (event.kind !== "jobs" && event.kind !== "matches") continue;
    const jobs =
      (event.data as Array<{
        id: string;
        title: string;
        companyName: string;
      }>) ?? [];
    const list = jobs.slice(0, MAX_JOBS_IN_REPLY).map((job) => {
      return `• ${job.title} — ${job.companyName}\n${siteUrl()}${localePrefix(locale)}/jobs/${job.id}`;
    });
    if (list.length) out.push(list.join("\n\n"));
  }

  for (const event of events) {
    if (event.type === "confirm_request") {
      // A write needs an account and a confirmation the chat cannot show.
      out.push(fill(lines.signIn));
      break;
    }
    if (event.type === "error") {
      const code = event.code;
      out.push(
        fill(
          code === "BOT_UNAVAILABLE"
            ? lines.unavailable
            : code === "BOT_BUDGET_EXCEEDED"
              ? lines.budget
              : code === "RATE_LIMITED"
                ? lines.rateLimited
                : lines.tryLater,
        ),
      );
      break;
    }
  }
  return out.length ? out : [fill(lines.empty)];
}

/**
 * Ordinary chat with the bot, answered by the same agent as the site (D311).
 * Called only for updates the sign-in flow did not take.
 */
export async function handleTelegramAgentUpdate(
  token: string,
  raw: unknown,
  now = new Date(),
): Promise<void> {
  const update = (raw ?? {}) as TelegramAgentUpdate;
  const message = update.message;
  if (!message) return;
  const chatId = message.chat?.id;
  const text = message.text?.trim();
  const from = message.from;
  if (!text || typeof chatId !== "number") return;
  if (!from || from.is_bot || typeof from.id !== "number") return;

  const { lines, locale } = linesFor(from.language_code);
  if (text === "/help" || text === "/help@") {
    await sendTelegramMessage(token, chatId, fill(lines.help));
    return;
  }
  if (text === "/reset") {
    resets.set(chatId, resetSessionToken(chatId, now));
    await sendTelegramMessage(token, chatId, fill(lines.reset));
    return;
  }
  // Other slash commands are not ours; stay quiet rather than guess.
  if (text.startsWith("/")) return;

  const userId = await userIdForTelegramId(from.id);
  const sessionToken = resets.get(chatId) ?? chatSessionToken(chatId);
  const { conversation } = await resolveConversation({
    userId,
    token: sessionToken,
    locale,
  });

  await sendTelegramChatAction(token, chatId, "typing").catch(() => undefined);

  const events: BotEvent[] = [];
  try {
    await handleMessage(
      {
        userId,
        conversation,
        text,
        // Rate limits key guests by address; one chat is one caller here.
        ip: `tg:${chatId}`,
        locale,
      },
      (event) => events.push(event),
      now,
    );
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.name : "Error" },
      "telegram agent turn failed",
    );
    await sendTelegramMessage(token, chatId, fill(lines.tryLater));
    return;
  }

  for (const part of render(events, lines, locale)) {
    await sendTelegramMessage(token, chatId, part);
  }
}
