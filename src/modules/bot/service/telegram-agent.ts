import { createHmac } from "node:crypto";
import { logger } from "@/lib/logger";
import { siteUrl } from "@/lib/supabase/env";
import {
  sendTelegramChatAction,
  sendTelegramLinks,
  sendTelegramMessage,
  userIdForTelegramId,
} from "@/modules/auth/service";
import {
  handleMessage,
  resolveConversation,
  type BotEvent,
} from "./conversation";
import { localePrefix } from "@/i18n/paths";
import { isOfferAction, offerPath, type OfferAction } from "./offers";

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
    signIn: "To save a job or apply, sign in, then come back here.",
    signInButton: "Sign in",
    openJob: "Open",
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
    signIn: "Чтобы сохранить вакансию или откликнуться, войдите и возвращайтесь сюда.",
    signInButton: "Войти",
    openJob: "Открыть",
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
      "Para salvar uma vaga ou se candidatar, entre e depois volte aqui.",
    signInButton: "Entrar",
    openJob: "Abrir",
    more: "Mais no catálogo: {site}/pt-BR/jobs",
  },
} as const;

type Lines = { readonly [K in keyof (typeof copy)["en"]]: string };

const OFFER_BUTTON: Record<string, Record<OfferAction, string>> = {
  en: {
    pay_hire: "Pay for Hire",
    pay_team: "Pay for Team",
    pay_plus: "Pay for Plus",
    pay_pro: "Pay for Pro",
    pricing: "See plans",
    register: "Create account",
    post_job: "Post a job",
  },
  ru: {
    pay_hire: "Оплатить «Найм»",
    pay_team: "Оплатить «Команду»",
    pay_plus: "Оплатить Plus",
    pay_pro: "Оплатить Pro",
    pricing: "Открыть тарифы",
    register: "Создать аккаунт",
    post_job: "Разместить вакансию",
  },
  "pt-BR": {
    pay_hire: "Pagar Hire",
    pay_team: "Pagar Team",
    pay_plus: "Pagar Plus",
    pay_pro: "Pagar Pro",
    pricing: "Ver planos",
    register: "Criar conta",
    post_job: "Publicar uma vaga",
  },
};

type LinkButton = { label: string; url: string };
type Part = { text: string; links: LinkButton[] };

function buttonsFor(locale: string): Record<OfferAction, string> {
  return OFFER_BUTTON[locale] ?? OFFER_BUTTON.en;
}

function pageUrl(locale: string, path: string): string {
  return `${siteUrl()}${localePrefix(locale)}${path}`;
}

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

/** Collects the turn's events into text and the buttons Telegram can show. */
function render(
  events: BotEvent[],
  lines: Lines,
  locale: string,
  signedIn: boolean,
): Part[] {
  const out: Part[] = [];
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
  const said = answer.trim().slice(0, TELEGRAM_TEXT_LIMIT);
  if (said) out.push({ text: said, links: [] });

  for (const event of events) {
    if (event.type !== "tool_result") continue;
    if (event.kind !== "jobs" && event.kind !== "matches") continue;
    const jobs =
      (event.data as Array<{
        id: string;
        title: string;
        companyName: string;
      }>) ?? [];
    const shown = jobs.slice(0, MAX_JOBS_IN_REPLY);
    const links = shown.map((job) => ({
      label: job.title.trim().slice(0, 64) || lines.openJob,
      url: pageUrl(locale, `/jobs/${job.id}`),
    }));
    const list = shown.map((job) => `• ${job.title} — ${job.companyName}`);
    if (list.length) out.push({ text: list.join("\n"), links });
  }

  const labels = buttonsFor(locale);
  for (const event of events) {
    if (event.type !== "tool_result" || event.kind !== "offer") continue;
    const action = (event.data as { action?: unknown } | null)?.action;
    if (!isOfferAction(action)) continue;
    const path = offerPath(action, signedIn);
    if (!path) continue;
    const label = labels[action];
    out.push({
      text: label,
      links: [{ label, url: pageUrl(locale, path) }],
    });
  }

  for (const event of events) {
    if (event.type === "confirm_request") {
      // A write needs an account and a confirmation this chat cannot press.
      out.push({
        text: fill(lines.signIn),
        links: [
          {
            label: lines.signInButton,
            url: pageUrl(locale, "/login?next=chat"),
          },
        ],
      });
      break;
    }
    if (event.type === "error") {
      const code = event.code;
      out.push({
        text: fill(
          code === "BOT_UNAVAILABLE"
            ? lines.unavailable
            : code === "BOT_BUDGET_EXCEEDED"
              ? lines.budget
              : code === "RATE_LIMITED"
                ? lines.rateLimited
                : lines.tryLater,
        ),
        links: [],
      });
      break;
    }
  }
  return out.length ? out : [{ text: fill(lines.empty), links: [] }];
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

  for (const part of render(events, lines, locale, userId !== null)) {
    if (part.links.length) {
      await sendTelegramLinks(token, chatId, part.text, part.links);
    } else {
      await sendTelegramMessage(token, chatId, part.text);
    }
  }
}
