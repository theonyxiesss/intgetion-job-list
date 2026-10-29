import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendProposal } from "@/modules/freelance/service";

/** `POST /api/freelance/proposals` `{ taskId, price, deliveryDays, cover }` (TZ 47). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("freelanceProposal", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    const proposal = await sendProposal(user.id, body);
    return Response.json(
      { proposal: { id: proposal.id, status: proposal.status } },
      { status: 201 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
