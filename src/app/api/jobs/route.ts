import { readJson, toErrorResponse } from "@/lib/http";
import { requireMembership, requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { createJobInput } from "@/modules/jobs/schemas";
import {
  createJob,
  findMemberRole,
  listJobsForUser,
} from "@/modules/jobs/service";

const recruiterRoles = ["owner", "admin", "recruiter"] as const;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const rows = await listJobsForUser(user.id);
    return Response.json({ jobs: rows.map(({ job }) => toJobDto(job)) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, createJobInput);
    await requireMembership(
      input.companyId,
      recruiterRoles,
      findMemberRole,
      async () => user,
    );
    const { data } = await supabase.auth.getUser();
    const job = await createJob(user, data.user?.email, input);
    return Response.json({ job: toJobDto(job) }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
