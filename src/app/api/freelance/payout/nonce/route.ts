import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issuePayoutNonce } from "@/modules/freelance/service";

/** `POST /api/freelance/payout/nonce` `{ address, chainId }` (28.6, D463). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("billingSiwe", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    return Response.json(await issuePayoutNonce(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
