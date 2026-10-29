import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  acceptProposal,
  declineProposal,
  withdrawProposal,
} from "@/modules/freelance/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `POST /api/freelance/proposals/:id` `{ action }` (TZ 47): the client
 * accepts (an order is made) or declines; the freelancer withdraws.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!UUID.test(id)) throw validationError({ fields: ["id"] });
    const body = (await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    })) as { action?: unknown };
    if (body.action === "accept") {
      const order = await acceptProposal(user.id, id);
      return Response.json({ order: { id: order.id, status: order.status } });
    }
    if (body.action === "decline") {
      const row = await declineProposal(user.id, id);
      return Response.json({ proposal: { id: row.id, status: row.status } });
    }
    if (body.action === "withdraw") {
      const row = await withdrawProposal(user.id, id);
      return Response.json({ proposal: { id: row.id, status: row.status } });
    }
    throw validationError({ fields: ["action"] });
  } catch (error) {
    return toErrorResponse(error);
  }
}
