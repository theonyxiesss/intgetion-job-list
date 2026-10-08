import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { refreshHireOrder } from "@/modules/billing/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    return Response.json(await refreshHireOrder(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
