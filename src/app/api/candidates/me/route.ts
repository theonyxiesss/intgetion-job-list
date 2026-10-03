import { readJson, toErrorResponse, notFound } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  getOwnCandidate,
  saveCandidateProfile,
  updateCandidateInput,
} from "@/modules/candidates/service";

export async function GET() {
  try {
    const user = await requireUser();
    const profile = await getOwnCandidate(user.id);
    if (!profile) throw notFound();
    return Response.json(profile);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, updateCandidateInput);
    return Response.json(await saveCandidateProfile(user.id, input));
  } catch (error) {
    return toErrorResponse(error);
  }
}
