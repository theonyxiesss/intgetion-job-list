import { toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { getCandidateForViewer } from "@/modules/candidates/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    return Response.json(await getCandidateForViewer(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}
