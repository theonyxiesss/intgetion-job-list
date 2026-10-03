import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { hideJobForUser } from "@/modules/feedback/service";
import { hideJobInput } from "@/modules/feedback/schemas";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    const input = await readJson(request, hideJobInput);
    const result = await hideJobForUser(user.id, id, input);
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
