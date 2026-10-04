import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { dismissMatchInput } from "@/modules/matching/schemas";
import { dismissMatch } from "@/modules/matching/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { jobId } = await context.params;
    const input = await readJson(request, dismissMatchInput);
    await dismissMatch(user.id, jobId, input.reason);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
