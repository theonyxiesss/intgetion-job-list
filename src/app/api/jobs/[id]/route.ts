import { readJson, toErrorResponse, HttpError } from "@/lib/http";
import { requireMembership, requireUser } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { toJobDto } from "@/modules/jobs/api/dto";
import { patchJobInput } from "@/modules/jobs/schemas";
import { getJobForPublic } from "@/modules/jobs/service";
import {
  findMemberRole,
  findOwnedJob,
  updateJob,
} from "@/modules/jobs/service";

const recruiterRoles = ["owner", "admin", "recruiter"] as const;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    let userId: string | undefined;
    let isAdmin = false;
    try {
      const supabase = await createSupabaseServerClient();
      const user = await getCurrentUser(supabase.auth);
      userId = user?.id;
      isAdmin = user?.platformRole === "admin";
    } catch {
      /* Public listing remains available to guests. */
    }
    // Guests read the JSON API under a per-IP limit (D218).
    if (!userId) {
      await enforceRateLimit("publicApi", clientIp(request.headers));
    }
    const job = await getJobForPublic(id, {
      userId,
      isAdmin,
      locale: request.headers.get("accept-language")?.startsWith("ru")
        ? "ru"
        : "en",
    });
    return job
      ? Response.json({ job })
      : Response.json(
          { error: { code: "NOT_FOUND", message: "Not found" } },
          { status: 404 },
        );
  } catch (error) {
    return toErrorResponse(error);
  }
}

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
