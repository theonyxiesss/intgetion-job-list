import { timingSafeEqual } from "node:crypto";
import { flags } from "@/config/flags";
import { notFound, toErrorResponse } from "@/lib/http";
import { runFixtureImports, runLiveImports } from "@/modules/ingestion/service";

export const dynamic = "force-dynamic";
/** D412: one live source per call stops taking records after 200 s. */
export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hourly import. With IMPORT_LIVE_ENABLED the most overdue approved live
 * source runs (8B, D375, D412). Otherwise the fixture sources run, only
 * against a local database, and the two never mix.
 */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const sources = flags.importLiveEnabled
      ? await runLiveImports()
      : await runFixtureImports();
    return Response.json({ ok: true, live: flags.importLiveEnabled, sources });
  } catch (error) {
    return toErrorResponse(error);
  }
}
