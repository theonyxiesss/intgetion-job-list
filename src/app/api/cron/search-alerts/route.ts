import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runCompanyAlerts } from "@/modules/follows/service";
import { runSearchAlerts } from "@/modules/saved-searches/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Daily saved-search and followed-company alerts (D234, D240). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    return Response.json({
      ok: true,
      searches: await runSearchAlerts(),
      companies: await runCompanyAlerts(),
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
