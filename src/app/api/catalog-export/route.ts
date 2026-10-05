import { logger } from "@/lib/logger";
import { privacyHash } from "@/lib/privacy-hash";
import { clientIp } from "@/lib/request-ip";

export const dynamic = "force-dynamic";

/**
 * Scraper trap (D218): the only link here is hidden from people and
 * disallowed in robots.txt. A hit is logged for the alerts (RUNBOOK) with
 * a hashed IP, and the caller gets the same 404 as any unknown path.
 */
export async function GET(request: Request) {
  logger.warn(
    {
      event: "scrape.trap",
      ipHash: privacyHash(clientIp(request.headers)),
      userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
    },
    "scraper trap requested",
  );
  return Response.json(
    { error: { code: "NOT_FOUND", message: "Not found" } },
    { status: 404 },
  );
}
