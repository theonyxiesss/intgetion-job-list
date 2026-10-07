import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { siteUrl } from "@/lib/supabase/env";
import { telegramSender } from "@/lib/telegram-bot";
import { telegramBotToken } from "@/modules/auth/service";
import { runJobsAlert } from "@/modules/jobs/service";
import { runTelegramDispatch } from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Notifications as Telegram messages, every 5 minutes (D237). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const token = telegramBotToken();
    // Without the bot token Telegram is simply off.
    if (!token) return Response.json({ ok: true, disabled: true });
    const sender = telegramSender(token);
    const dispatch = await runTelegramDispatch({
      sender,
      siteUrl: siteUrl(),
    });
    const jobsAlert = await runJobsAlert({
      sender,
      host: new URL(siteUrl()).host,
      chatIdRaw: process.env.JOBS_ALERT_CHAT_ID,
    });
    return Response.json({ ok: true, ...dispatch, jobsAlert });
  } catch (error) {
    return toErrorResponse(error);
  }
}
