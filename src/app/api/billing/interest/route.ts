import { z } from "zod";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { recordBillingInterest } from "@/modules/billing/service";

const body = z.object({
  email: z.string().email().optional(),
  token: z.enum(["USDC", "USDT"]).optional(),
  chain: z.string().max(32).optional(),
});

export async function POST(request: Request) {
  try {
    await enforceRateLimit("billingInterest", clientIp(request.headers));
    const input = await readJson(request, body);
    let userId: string | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      userId = (await getCurrentUser(supabase.auth))?.id ?? null;
    } catch {
      userId = null;
    }
    await recordBillingInterest({
      userId,
      email: input.email ?? null,
      token: input.token ?? null,
      chain: input.chain ?? null,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
