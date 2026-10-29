import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  assertOrderId,
  getRoomFeed,
  postRoomMessage,
} from "@/modules/freelance/service";

/** `GET /api/freelance/orders/:id/messages` — the order room feed (TZ 45). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    assertOrderId(id);
    return Response.json(await getRoomFeed(user.id, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/freelance/orders/:id/messages` `{ body, links? }` (TZ 45 §3). */
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
    return Response.json(await postRoomMessage(user.id, id, body), {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
