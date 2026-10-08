import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { createCryptoOrder } from "@/modules/billing/service";

const body = z
  .object({
    plan: z.enum(["hire", "team", "plus", "pro"]).default("hire"),
    token: z.enum(["USDC", "USDT"]),
    jobId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.plan === "hire" && !value.jobId) {
      ctx.addIssue({ code: "custom", path: ["jobId"], message: "job" });
    }
    if (value.plan === "team" && !value.companyId) {
      ctx.addIssue({ code: "custom", path: ["companyId"], message: "company" });
    }
  });

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    await enforceRateLimit("billingOrder", user.id);
    const input = await readJson(request, body);
    return Response.json(await createCryptoOrder(user.id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}
