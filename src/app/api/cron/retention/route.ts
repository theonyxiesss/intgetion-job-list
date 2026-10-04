import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runRetention } from "@/modules/privacy/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Daily retention of section 17 (10C). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    return Response.json({ ok: true, ...(await runRetention()) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
