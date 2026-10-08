import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { confirmHireOrder } from "@/modules/billing/service";
import { sendHireMail } from "@/modules/billing/service/hire-mail";

const body = z.object({
  orderId: z.string().uuid(),
  txHash: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingConfirm", user.id);
    const input = await readJson(request, body);
    const result = await confirmHireOrder(user.id, input.orderId, input.txHash);
    if (result.granted && result.plan === "hire" && result.jobId) {
      const authUser = await supabase.auth.getUser();
      await sendHireMail({
        to: authUser.data.user?.email ?? null,
        locale: user.locale,
        jobId: result.jobId,
      });
    }
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
