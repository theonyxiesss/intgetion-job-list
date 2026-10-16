import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { refreshOrderPayment } from "@/modules/freelance/service";

/** `GET /api/freelance/payments/:id` — the buyer's status poll (28.6). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await refreshOrderPayment(user.id, id), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
