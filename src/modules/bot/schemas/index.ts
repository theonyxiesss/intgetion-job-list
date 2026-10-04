import { z } from "zod";

const locale = z.enum(["en", "ru"]);

/**
 * `POST /api/bot/message` (section 6). The conversation comes from the
 * `bot_session` cookie; a `conversationId` in the body is accepted for the
 * spec's shape but never trusted (D172).
 */
export const botMessageInput = z
  .object({
    conversationId: z.uuid().optional(),
    text: z.string().trim().min(1).max(2000),
    locale: locale.optional(),
  })
  .strict();

/** `POST /api/bot/confirm` (12.3). */
export const botConfirmInput = z
  .object({
    conversationId: z.uuid().optional(),
    confirmationId: z.uuid(),
    accept: z.boolean(),
  })
  .strict();
