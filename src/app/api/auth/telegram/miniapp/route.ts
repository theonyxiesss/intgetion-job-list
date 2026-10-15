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
import { logger, reportError } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { authAdminAvailable } from "@/lib/supabase/admin";
import { FRAMED_COOKIE, MINI_APP_COOKIE } from "@/lib/supabase/cookie-options";
import { siteUrl } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  miniAppContinuePath,
  miniAppSignedInHtml,
} from "@/lib/telegram-web-app-boot";
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
 * A form post from the phone answers with a document that sets the cookie,
 * then opens the site. A redirect's Set-Cookie does not stick in that
 * webview (D427, D428). Telegram Web is a frame, so it still gets the
 * redirect: a document with the API page's frame policy would stay blank.
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
      logger.info(
        { context: "telegram_miniapp", result: "invalid" },
        "telegram mini app",
      );
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
    logger.info(
      { context: "telegram_miniapp", result: "ok" },
      "telegram mini app",
    );
    if (form) {
      const landing = miniAppContinuePath(body.locale);
      if (framed) return siteRedirect(landing);
      return new NextResponse(miniAppSignedInHtml(landing), {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store",
        },
      });
    }
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
