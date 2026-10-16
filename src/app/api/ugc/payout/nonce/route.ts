import { HttpError, toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issuePayoutNonce } from "@/modules/freelance/service";
import { getMyCreatorProfile } from "@/modules/ugc/service";

/**
 * `POST /api/ugc/payout/nonce` `{ address, chainId }` — a UGC creator proves
 * the payout address (D466). The same address and the same verify step as
 * freelance (`/api/freelance/payout/verify`).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("billingSiwe", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    if (!(await getMyCreatorProfile(user.id)).profile) {
      throw new HttpError(
        409,
        "PROFILE_INCOMPLETE",
        "Fill in the creator profile first",
      );
    }
    return Response.json(
      await issuePayoutNonce(user.id, body, new Date(), "creator"),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
