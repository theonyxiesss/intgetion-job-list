import { readJson, toErrorResponse, HttpError } from "@/lib/http";
import { requireMembership, requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { patchJobInput } from "@/modules/jobs/schemas";
import {
  findMemberRole,
  findOwnedJob,
  updateJob,
} from "@/modules/jobs/service";

const recruiterRoles = ["owner", "admin", "recruiter"] as const;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id } = await context.params;
    const existing = await findOwnedJob(id, user.id);
    await requireMembership(
      existing.companyId,
      recruiterRoles,
      findMemberRole,
      async () => user,
    );
    if (
      !["draft", "paused", "pending_moderation", "published"].includes(
        existing.status,
      )
    ) {
      throw new HttpError(
        409,
        "INVALID_TRANSITION",
        "This job cannot be edited in its current state",
      );
    }
    const input = await readJson(request, patchJobInput);
    const { data } = await supabase.auth.getUser();
    const job = await updateJob(id, input, user, data.user?.email);
    return Response.json({ job: toJobDto(job) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
