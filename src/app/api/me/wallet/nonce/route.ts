import { toErrorResponse, validationError } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { issueAccountWalletNonce } from "@/modules/users/service";

/** `POST /api/me/wallet/nonce` `{ address, chainId }` — the message to sign (D518). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    await enforceRateLimit("accountWallet", user.id);
    const body = await request.json().catch(() => {
      throw validationError([{ path: [], message: "invalid_json" }]);
    });
    return Response.json(await issueAccountWalletNonce(user.id, body));
  } catch (error) {
    return toErrorResponse(error);
  }
}
