import { readJson, toErrorResponse } from "@/lib/http";
import { requireCandidate } from "@/lib/auth-guards";
import { enforceRateLimit } from "@/lib/rate-limit";
import { hasCandidateProfile } from "@/modules/candidates/service";
import { matchFeedbackInput } from "@/modules/feedback/schemas";
import { dismissJobForUser } from "@/modules/feedback/service";

/** Section 7: "not a fit" — a dismissed event through the 4B service. */
export async function POST(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  try {
    const user = await requireCandidate(hasCandidateProfile);
    const { jobId } = await context.params;
    const input = await readJson(request, matchFeedbackInput);
    await enforceRateLimit("matchFeedback", user.id);
    const result = await dismissJobForUser(user.id, jobId, {
      reason: input.reason,
    });
    return Response.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}
