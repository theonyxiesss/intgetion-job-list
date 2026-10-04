import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runMatchingCron } from "@/modules/matching/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    return Response.json({ ok: true, ...(await runMatchingCron()) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
