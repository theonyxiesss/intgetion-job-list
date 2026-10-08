import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { setOwnCompanyAgentBriefs } from "@/modules/companies/service";
import { agentBriefsInput } from "@/modules/notifications/schemas";

/** The company agent flag, for owners and admins only (D352). */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, agentBriefsInput);
    const enabled = await setOwnCompanyAgentBriefs(user.id, input.enabled);
    return Response.json({ enabled });
  } catch (error) {
    return toErrorResponse(error);
  }
}
