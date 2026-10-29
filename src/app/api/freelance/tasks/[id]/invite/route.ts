import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { inviteSeller } from "@/modules/freelance/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** `POST /api/freelance/tasks/:id/invite` `{ sellerId }` — invite a freelancer (TZ 49, A4). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = (await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    })) as { sellerId?: unknown };
    if (!UUID.test(id)) throw validationError({ fields: ["id"] });
    if (typeof body.sellerId !== "string" || !UUID.test(body.sellerId)) {
      throw validationError({ fields: ["sellerId"] });
    }
    await enforceRateLimit("freelanceInvite", user.id);
    await inviteSeller(user.id, id, body.sellerId);
    return Response.json({ invited: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
