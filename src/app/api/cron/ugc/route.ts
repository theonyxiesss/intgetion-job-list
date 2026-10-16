import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { noteDeadlines } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Deadline notes and silent-offer expiry for creative tests (D457). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const result = await noteDeadlines();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return toErrorResponse(error);
  }
}
