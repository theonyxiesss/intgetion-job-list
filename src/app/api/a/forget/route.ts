import { readJson, toErrorResponse } from "@/lib/http";
import { forgetInput, forgetVisitor } from "@/modules/analytics/service";

export const dynamic = "force-dynamic";

/**
 * Withdrawn analytics consent (D226): events of this visitor id lose it.
 * Knowing the random id is the only proof needed — it identifies nobody.
 */
export async function POST(request: Request) {
  try {
    const { visitorId } = await readJson(request, forgetInput);
    await forgetVisitor(visitorId);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
