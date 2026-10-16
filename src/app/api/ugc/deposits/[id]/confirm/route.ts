import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { confirmCampaignDeposit } from "@/modules/ugc/service";

/** `POST /api/ugc/deposits/:id/confirm` `{ txHash }` — the server reads the receipt (D466). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await enforceRateLimit("billingConfirm", user.id);
    const body = (await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    })) as { txHash?: unknown } | null;
    return Response.json(
      await confirmCampaignDeposit(user.id, id, body?.txHash),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
