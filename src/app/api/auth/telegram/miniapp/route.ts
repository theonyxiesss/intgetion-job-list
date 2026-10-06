import { z } from "zod";
import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { authAdminAvailable } from "@/lib/supabase/admin";
import {
  framedMarkerCookie,
  phoneMiniAppCookie,
} from "@/lib/supabase/cookie-options";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  auditSignIn,
  localeSchema,
  signInWithTelegramProfile,
  telegramBotToken,
  verifyTelegramInitData,
} from "@/modules/auth/service";

const input = z.object({
  initData: z.string().min(1).max(4096),
  locale: localeSchema,
  framed: z.boolean().optional(),
});

/** Signs in whoever opened the Mini App inside Telegram (D259). */
export async function POST(request: Request) {
  try {
    const token = telegramBotToken();
    if (!token || !authAdminAvailable()) {
      throw new HttpError(503, "TELEGRAM_DISABLED", "Telegram is not set up");
    }
    const body = await readJson(request, input);
    const ip = clientIp(request.headers);
    await enforceRateLimit("login", `${ip}|telegram-miniapp`);
    const profile = verifyTelegramInitData(body.initData, token);
    if (!profile) {
      throw new HttpError(401, "TELEGRAM_FAILED", "Telegram sign-in failed");
    }
    // Only an explicit true means Telegram Web's frame (D315). Anything
    // else — phone webview, desktop app, missing field — stays first-party
    // Lax, or the session is dropped (D321).
    const framed = body.framed === true;
    const supabase = await createSupabaseServerClient({ framed });
    const user = await signInWithTelegramProfile(
      supabase.auth,
      { id: profile.id, username: profile.username },
      body.locale,
    );
    await auditSignIn(user, "telegram", ip);
    return Response.json(
      { ok: true },
      {
        headers: {
          "set-cookie": framed ? framedMarkerCookie() : phoneMiniAppCookie(),
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
