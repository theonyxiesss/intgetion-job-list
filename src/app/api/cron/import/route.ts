import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { flags } from "@/config/flags";
import {
  runFixtureImports,
  runLiveImports,
} from "@/modules/ingestion/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Hourly import. With IMPORT_LIVE_ENABLED=true the approved live sources run
 * (8B, D342), each by its own interval; fixtures never mix with real jobs.
 * Otherwise the 8A fixtures run, as before.
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
