import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { billingMe } from "@/modules/billing/service";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    return Response.json(await billingMe(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
