import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { refreshCampaignDeposit } from "@/modules/ugc/service";

/** `GET /api/ugc/deposits/:id` — the payer's status poll (D466). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await refreshCampaignDeposit(user.id, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
