import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  disconnectAccountWallet,
  readAccountWallet,
  walletChangeImpact,
} from "@/modules/users/service";

/** `GET /api/me/wallet` — the account wallet and what a change touches (D518). */
export async function GET() {
  try {
    const user = await requireUser();
    const [wallet, impact] = await Promise.all([
      readAccountWallet(user.id),
      walletChangeImpact(user.id),
    ]);
    return Response.json(
      { wallet, impact },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/me/wallet` — disconnect; refused while rewards are owed. */
export async function DELETE() {
  try {
    const user = await requireUser();
    await enforceRateLimit("accountWallet", user.id);
    await disconnectAccountWallet(user.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
