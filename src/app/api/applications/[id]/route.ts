import { toErrorResponse, notFound } from "@/lib/http";
import { requireCandidate } from "@/lib/auth-guards";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { getOwnApplication } from "@/modules/applications/service";
import { z } from "zod";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireCandidate(hasCandidateProfile);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    return Response.json(await getOwnApplication(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
