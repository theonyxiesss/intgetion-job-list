import { logger } from "@/lib/logger";

export type TelegramSendResult = "sent" | "blocked" | "failed";

/** Sends text through the platform bot (D237). */
export type TelegramSender = (
  chatId: number,
  text: string,
) => Promise<TelegramSendResult>;

/**
 * Bot API sendMessage as plain text, no markup to escape. "blocked": the
 * person stopped or blocked the bot (403) — nothing to retry.
 */
export function telegramSender(botToken: string): TelegramSender {
  return async (chatId, text) => {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: text.slice(0, 4000),
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(10_000),
        },
      );
      if (response.ok) return "sent";
      if (response.status === 403) return "blocked";
      logger.warn({ status: response.status }, "telegram send refused");
      return "failed";
    } catch (error) {
      logger.warn({ err: error }, "telegram send failed");
      return "failed";
    }
  };
}
