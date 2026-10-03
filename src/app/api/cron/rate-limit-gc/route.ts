import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { deleteExpiredCounters } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") ?? "";
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Hourly: drops rate-limit windows older than 48 hours (section 17). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const deleted = await deleteExpiredCounters();
    return Response.json({ ok: true, deleted });
  } catch (error) {
    return toErrorResponse(error);
  }
}
