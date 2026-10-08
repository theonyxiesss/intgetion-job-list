import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { createHireOrder } from "@/modules/billing/service";

const body = z.object({
  jobId: z.string().uuid(),
  token: z.enum(["USDC", "USDT"]),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingOrder", user.id);
    const input = await readJson(request, body);
    return Response.json(await createHireOrder(user.id, input.jobId, input.token));
  } catch (error) {
    return toErrorResponse(error);
  }
}
