import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { assertOrderId, moveOrder } from "@/modules/freelance/service";

/** `POST /api/freelance/orders/:id/transition` `{ to, deliveryUrl? }` (28.4). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    assertOrderId(id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const order = await moveOrder(user.id, id, body);
    return Response.json({ order: { id: order.id, status: order.status } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
