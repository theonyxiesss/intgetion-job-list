import { siteUrl } from "@/lib/supabase/env";
import { siteOwnsTelegramWebhook, telegramWebhookSecret } from "./telegram";

type TelegramResult = { ok?: boolean; result?: unknown };

let usernameCache: Promise<string> | null = null;
let webhookCache: Promise<void> | null = null;

async function telegramApi(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as TelegramResult | null;
  if (!response.ok || !payload?.ok) {
    throw new Error("Telegram API request failed");
  }
  return payload.result;
}

/** Public @username from getMe. Cached for the life of the process. */
export function telegramBotUsername(token: string): Promise<string> {
  usernameCache ??= telegramApi(token, "getMe", {})
    .then((result) => {
      const username = (result as { username?: string } | null)?.username;
      if (!username) throw new Error("Telegram bot has no username");
      return username;
    })
    .catch((error: unknown) => {
      usernameCache = null;
      throw error;
    });
  return usernameCache;
}

/** Points this bot's webhook at the site. Repeated calls are idempotent. */
export function ensureTelegramWebhook(token: string): Promise<void> {
  if (!siteOwnsTelegramWebhook(siteUrl())) return Promise.resolve();
  webhookCache ??= telegramApi(token, "setWebhook", {
    url: `${siteUrl()}/api/telegram/webhook`,
    secret_token: telegramWebhookSecret(token),
    allowed_updates: ["message", "callback_query"],
  })
    .then(() => undefined)
    .catch((error: unknown) => {
      webhookCache = null;
      throw error;
    });
  return webhookCache;
}

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  button?: { label: string; data: string },
): Promise<void> {
  await telegramApi(token, "sendMessage", {
    chat_id: chatId,
    text,
    ...(button
      ? {
          reply_markup: {
            inline_keyboard: [
              [{ text: button.label, callback_data: button.data }],
            ],
          },
        }
      : {}),
  });
}

/** The «typing…» hint while the agent thinks (D311). Failure is not fatal. */
export async function sendTelegramChatAction(
  token: string,
  chatId: number,
  action: "typing",
): Promise<void> {
  await telegramApi(token, "sendChatAction", { chat_id: chatId, action });
}

export async function answerTelegramCallback(
  token: string,
  callbackId: string,
): Promise<void> {
  await telegramApi(token, "answerCallbackQuery", {
    callback_query_id: callbackId,
  });
}
