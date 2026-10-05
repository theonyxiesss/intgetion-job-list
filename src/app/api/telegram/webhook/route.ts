import { logger } from "@/lib/logger";
import {
  handleTelegramWebhook,
  telegramBotToken,
  telegramWebhookSecretMatches,
} from "@/modules/auth/service";

/** Telegram Bot API webhook (D256). Authenticated by the secret header, not Origin. */
export async function POST(request: Request) {
  const token = telegramBotToken();
  if (!token) return new Response(null, { status: 404 });
  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (!telegramWebhookSecretMatches(token, secret)) {
    return new Response(null, { status: 401 });
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > 100_000) return new Response(null, { status: 200 });
  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!update || typeof update !== "object")
    return new Response(null, { status: 200 });
  try {
    await handleTelegramWebhook(token, update);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? error.name : "Error" },
      "telegram webhook failed",
    );
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}
