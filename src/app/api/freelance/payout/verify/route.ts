import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { verifyPayoutSignature } from "@/modules/freelance/service";

/** `POST /api/freelance/payout/verify` `{ signature }` (28.6, D463). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("billingSiwe", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    return Response.json(await verifyPayoutSignature(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
