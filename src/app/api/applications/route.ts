import { readJson, readQuery, toErrorResponse, notFound } from "@/lib/http";
import { requireCandidate } from "@/lib/auth-guards";
import { hasCandidateProfile } from "@/modules/candidates/service";
import {
  applyToJob,
  createApplicationInput,
  listApplicationsQuery,
  listOwnApplications,
} from "@/modules/applications/service";

export async function GET(request: Request) {
  try {
    const user = await requireCandidate(hasCandidateProfile);
    const query = readQuery(request, listApplicationsQuery);
    if (query.as === "employer") throw notFound();
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
    return Response.json({ application }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
