import { z } from "zod";
import { notFound, toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createCampaignDeposit } from "@/modules/ugc/service";

/** `POST /api/ugc/campaigns/:id/deposit` `{ token }` — a member pays in the budget (D466). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    await enforceRateLimit("billingOrder", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    return Response.json(await createCampaignDeposit(user.id, id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
