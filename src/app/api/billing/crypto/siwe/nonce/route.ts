import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { issueNonEvmNonce, issueWalletNonce } from "@/modules/billing/service";

const body = z.union([
  z.object({
    network: z.enum(["tron", "solana"]),
    address: z.string().min(1).max(64),
  }),
  z.object({
    address: z.string().min(1),
    chainId: z.number().int(),
  }),
]);

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingSiwe", user.id);
    const input = await readJson(request, body);
    if ("network" in input) {
      return Response.json(
        await issueNonEvmNonce(user.id, input.network, input.address),
      );
    }
    return Response.json(
      await issueWalletNonce(user.id, input.address, input.chainId),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
