import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { refreshSanctionsList } from "@/modules/billing/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Daily refresh of the OFAC SDN crypto addresses (D380). */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    return Response.json({ ok: true, ...(await refreshSanctionsList()) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
