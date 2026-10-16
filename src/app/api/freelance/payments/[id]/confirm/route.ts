import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { confirmOrderPayment } from "@/modules/freelance/service";

/** `POST /api/freelance/payments/:id/confirm` `{ txHash }` — the server reads the receipt (28.6). */
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
    return Response.json(await confirmOrderPayment(user.id, id, body?.txHash));
  } catch (error) {
    return toErrorResponse(error);
  }
}
