import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { issueWalletNonce } from "@/modules/billing/service";

const body = z.object({
  address: z.string().min(1),
  chainId: z.number().int(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingSiwe", user.id);
    const input = await readJson(request, body);
    return Response.json(
      await issueWalletNonce(user.id, input.address, input.chainId),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
