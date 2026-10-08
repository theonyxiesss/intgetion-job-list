import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { verifyWalletSignature } from "@/modules/billing/service";

const body = z.object({ signature: z.string().min(1) });

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingSiwe", user.id);
    const input = await readJson(request, body);
    await verifyWalletSignature(user.id, input.signature);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
