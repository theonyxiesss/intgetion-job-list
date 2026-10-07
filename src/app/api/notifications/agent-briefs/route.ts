import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { setOwnAgentBriefsEnabled } from "@/modules/candidates/service";
import { agentBriefsInput } from "@/modules/notifications/schemas";

/** The signed-in user's own agent-brief flag (D349). */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, agentBriefsInput);
    const enabled = await setOwnAgentBriefsEnabled(user.id, input.enabled);
    return Response.json({ enabled });
  } catch (error) {
    return toErrorResponse(error);
  }
}
