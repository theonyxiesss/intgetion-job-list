import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { beaconInput, trackPageView } from "@/modules/analytics/service";

export const dynamic = "force-dynamic";

/**
 * Page-view beacon of our own analytics (D225). Always 204 for valid input;
 * past 600 beacons an hour from one IP they are dropped without a word.
 */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, beaconInput);
    try {
      await enforceRateLimit("beacon", clientIp(request.headers));
    } catch (error) {
      if (error instanceof HttpError && error.status === 429) {
        return new Response(null, { status: 204 });
      }
      throw error;
    }
    await trackPageView(request, input);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
