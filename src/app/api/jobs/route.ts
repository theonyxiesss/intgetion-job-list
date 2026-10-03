import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { requireMembership, requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { createJobInput } from "@/modules/jobs/schemas";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { createJob, findMemberRole, searchJobs } from "@/modules/jobs/service";

const recruiterRoles = ["owner", "admin", "recruiter"] as const;

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const raw = Object.fromEntries(
      [...new Set(params.keys())].map((key) => [
        key,
        params.getAll(key).length > 1 ? params.getAll(key) : params.get(key),
      ]),
    );
    const parsed = jobSearchQuery.safeParse(raw);
    if (!parsed.success)
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid search filters",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    const started = performance.now();
    const result = await searchJobs(
      parsed.data,
      request.headers.get("accept-language")?.startsWith("ru") ? "ru" : "en",
    );
    const serverMs = performance.now() - started;
    return Response.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        "Server-Timing": `jobs;dur=${serverMs.toFixed(1)}`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_cursor")
      return toErrorResponse(
        new HttpError(400, "VALIDATION_ERROR", "Invalid page cursor"),
      );
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
