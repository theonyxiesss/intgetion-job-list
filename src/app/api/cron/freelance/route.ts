import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runOrderTimers } from "@/modules/freelance/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Freelance timers, every 15 minutes (D456): unanswered requests expire
 * after 72 hours, delivered work is accepted after 7 days (D447).
 */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const result = await runOrderTimers();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
