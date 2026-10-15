import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { localePath } from "@/i18n/paths";
import {
  HttpError,
  readFormDataLimited,
  readJson,
  toErrorResponse,
} from "@/lib/http";
import { reportError } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { authAdminAvailable } from "@/lib/supabase/admin";
import { FRAMED_COOKIE, MINI_APP_COOKIE } from "@/lib/supabase/cookie-options";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { miniAppContinuePath } from "@/lib/telegram-web-app-boot";
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

const markerMaxAge = 400 * 24 * 60 * 60;
const bodyMaxBytes = 8192;

function isFormPost(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return (
    type.includes("application/x-www-form-urlencoded") ||
    type.includes("multipart/form-data")
  );
}

function siteRedirect(path: string): NextResponse {
  return NextResponse.redirect(new URL(path, siteUrl()), 303);
}

/**
 * Signs in whoever opened the Mini App inside Telegram (D259).
 * A form post answers with a redirect: the iPhone webview keeps cookies
 * from that navigation, and drops the ones a fetch response sets (D427).
 */
export async function POST(request: Request) {
  const form = isFormPost(request);
  let locale = "en";
  try {
    const token = telegramBotToken();
    if (!token || !authAdminAvailable()) {
      throw new HttpError(503, "TELEGRAM_DISABLED", "Telegram is not set up");
    }
    const raw = form
      ? await readMiniAppForm(request)
      : await readJson(request, input);
    const parsed = input.safeParse(raw);
    if (!parsed.success) {
      throw new HttpError(400, "VALIDATION_ERROR", "Telegram sign-in failed");
    }
    const body = parsed.data;
    locale = body.locale;
    const ip = clientIp(request.headers);
    await enforceRateLimit("login", `${ip}|telegram-miniapp`);
    const profile = verifyTelegramInitData(body.initData, token);
    if (!profile) {
      throw new HttpError(401, "TELEGRAM_FAILED", "Telegram sign-in failed");
    }
    // Only an explicit true means Telegram Web's frame (D315, D321).
    const framed = body.framed === true;
    const supabase = await createSupabaseServerClient({ framed });
    const user = await signInWithTelegramProfile(
      supabase.auth,
      { id: profile.id, username: profile.username },
      body.locale,
    );
    await auditSignIn(user, "telegram", ip);
    // Write the marker through the cookie store — a raw Set-Cookie header on
    // the response can wipe the session cookies Supabase just set (D322).
    const jar = await cookies();
    if (framed) {
      jar.set(FRAMED_COOKIE, "1", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "none",
        partitioned: true,
        maxAge: markerMaxAge,
      });
    } else {
      jar.set(MINI_APP_COOKIE, "1", {
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: markerMaxAge,
      });
    }
    if (form) return siteRedirect(miniAppContinuePath(body.locale));
    return Response.json({ ok: true });
  } catch (error) {
    if (!form) return toErrorResponse(error);
    if (!(error instanceof HttpError) || error.status >= 500) {
      reportError(error, "telegram_miniapp");
    }
    return siteRedirect(localePath(locale, "/login"));
  }
}

async function readMiniAppForm(request: Request) {
  const form = await readFormDataLimited(request, bodyMaxBytes);
  return {
    initData: form.get("initData"),
    locale: form.get("locale"),
    framed: form.get("framed") === "1",
  };
}
