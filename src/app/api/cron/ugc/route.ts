import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { noteDeadlines, recheckCampaignDeposits } from "@/modules/ugc/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Deadline notes, silent-offer expiry (D457) and waiting deposits (D466). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const result = await noteDeadlines();
    const deposits = await recheckCampaignDeposits();
    return Response.json({ ok: true, ...result, deposits });
  } catch (error) {
    return toErrorResponse(error);
  }
}
