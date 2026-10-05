import { z } from "zod";
import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth-guards";
import {
  auditSignIn,
  getCurrentUser,
  linkTelegram,
  localeSchema,
  signInWithTelegram,
  telegramBotToken,
} from "@/modules/auth/service";

const telegramInput = z.object({
  result: z.string().min(1).max(4096),
  locale: localeSchema,
  /** "link": attach Telegram to the signed-in account (D230). */
  mode: z.enum(["signin", "link"]).default("signin"),
});

/** Finishes Telegram sign-in or linking from `/auth/telegram` (D217, D230). */
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
    if (input.mode === "link") {
      const current = await requireUser(() => getCurrentUser(supabase.auth));
      await linkTelegram(current, input.result, botToken);
      return Response.json({ ok: true });
    }
    const user = await signInWithTelegram(supabase.auth, input, botToken);
    await auditSignIn(user, "telegram", ip);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
