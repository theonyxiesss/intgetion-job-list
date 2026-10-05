import {
  readJson,
  readQuery,
  toErrorResponse,
  validationError,
} from "@/lib/http";
import { requireCandidate, requireUser } from "@/lib/auth-guards";
import { trackServerEvent } from "@/modules/analytics/service";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  applyToJob,
  createApplicationInput,
  listApplicationsQuery,
  listEmployerApplications,
  listOwnApplications,
} from "@/modules/applications/service";

export async function GET(request: Request) {
  try {
    const query = readQuery(request, listApplicationsQuery);
    if (query.as === "employer") {
      const user = await requireUser();
      if (!query.jobId) throw validationError({ jobId: ["required"] });
      return Response.json(
        await listEmployerApplications(user.id, {
          jobId: query.jobId,
          cursor: query.cursor,
          limit: query.limit,
        }),
      );
    }
    const user = await requireCandidate(hasCandidateProfile);
    const applications = await listOwnApplications(user.id);
    return Response.json({ applications });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCandidate(hasCandidateProfile);
    const input = await readJson(request, createApplicationInput);
    const application = await applyToJob(user.id, {
      jobId: input.jobId,
      coverNote: input.coverNote ?? null,
    });
    await trackServerEvent(request, "apply");
    return Response.json({ application }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
