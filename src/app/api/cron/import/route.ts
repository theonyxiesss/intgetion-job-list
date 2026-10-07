import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { runFixtureImports, runTestDrip } from "@/modules/ingestion/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Hourly fixture import (8A). Each source runs at most once an hour. */
export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const sources = await runFixtureImports();
    const drip = await runTestDrip();
    return Response.json({ ok: true, sources, drip });
  } catch (error) {
    return toErrorResponse(error);
  }
}
