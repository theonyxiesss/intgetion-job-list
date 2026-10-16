import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createOrderPayment } from "@/modules/freelance/service";

/** `POST /api/freelance/orders/:id/payment` `{ token }` — the buyer only (28.6). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await enforceRateLimit("billingOrder", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    return Response.json(await createOrderPayment(user.id, id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
