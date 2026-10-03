import { HttpError, toErrorResponse } from "@/lib/http";
import { requireMembership, requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import {
  findMemberRole,
  findOwnedJob,
  transitionOwnedJob,
} from "@/modules/jobs/service";
import type { JobAction } from "@/modules/jobs/service";

const recruiterRoles = ["owner", "admin", "recruiter"] as const;
const actions = new Set<JobAction>(["publish", "pause", "close", "extend"]);

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const { id, action } = await context.params;
    if (!actions.has(action as JobAction))
      throw new HttpError(404, "NOT_FOUND", "Not found");
    const existing = await findOwnedJob(id, user.id);
    await requireMembership(
      existing.companyId,
      recruiterRoles,
      findMemberRole,
      async () => user,
    );
    const job = await transitionOwnedJob(id, action as JobAction, user.id);
    return Response.json({ job: toJobDto(job) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
