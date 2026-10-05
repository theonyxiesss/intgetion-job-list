import { readJson, toErrorResponse } from "@/lib/http";
import { beaconInput, trackPageView } from "@/modules/analytics/service";

export const dynamic = "force-dynamic";

/** Page-view beacon of our own analytics (D225). Always 204 for valid input. */
export async function POST(request: Request) {
  try {
    await trackPageView(request, await readJson(request, beaconInput));
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
