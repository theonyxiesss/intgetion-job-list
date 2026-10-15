import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runEventImports } from "@/modules/events/service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Event feeds (D413). One approved feed per call; a feed is approved by the
 * founder (D18) and listed in EVENTS_IMPORT_SOURCES. With none listed, the
 * made-up fixture runs, and only against a local database.
 */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const sources = await runEventImports();
    return Response.json({ ok: true, sources });
  } catch (error) {
    return toErrorResponse(error);
  }
}
