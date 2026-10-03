import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { saveJobForUser, unsaveJobForUser } from "@/modules/feedback/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    const result = await saveJobForUser(user.id, id);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    const result = await unsaveJobForUser(user.id, id);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
