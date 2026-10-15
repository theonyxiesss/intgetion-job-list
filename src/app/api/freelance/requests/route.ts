import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendRequest } from "@/modules/freelance/service";

/** `POST /api/freelance/requests` — a request is also the order (28.4). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("freelanceRequest", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const order = await sendRequest(user.id, body);
    return Response.json(
      { order: { id: order.id, status: order.status } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
