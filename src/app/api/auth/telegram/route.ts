import { z } from "zod";
import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  auditSignIn,
  localeSchema,
  signInWithTelegram,
  telegramBotToken,
} from "@/modules/auth/service";

const telegramInput = z.object({
  result: z.string().min(1).max(4096),
  locale: localeSchema,
});

/** Finishes Telegram sign-in from `/auth/telegram` (D217). */
export async function POST(request: Request) {
  try {
    const botToken = telegramBotToken();
    if (!botToken) {
      throw new HttpError(503, "TELEGRAM_DISABLED", "Telegram is not set up");
    }
    const input = await readJson(request, telegramInput);
    const ip = clientIp(request.headers);
    await enforceRateLimit("login", `${ip}|telegram`);
    const supabase = await createSupabaseServerClient();
    const user = await signInWithTelegram(supabase.auth, input, botToken);
    await auditSignIn(user, "telegram", ip);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
