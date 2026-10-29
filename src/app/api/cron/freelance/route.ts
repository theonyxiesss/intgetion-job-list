import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import {
  expireOldTasks,
  recheckOrderPayments,
  runOrderTimers,
} from "@/modules/freelance/service";

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
 * after 72 hours, delivered work is accepted after 7 days (D447). Order
 * payments still waiting on the network are read again (D463).
 */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const result = await runOrderTimers();
    // Payments still waiting on confirmations (D463).
    const payments = await recheckOrderPayments();
    // Client tasks open longer than 30 days expire (TZ 47, D569).
    const tasksExpired = await expireOldTasks();
    return Response.json({ ok: true, ...result, payments, tasksExpired });
  } catch (error) {
    return toErrorResponse(error);
  }
}
