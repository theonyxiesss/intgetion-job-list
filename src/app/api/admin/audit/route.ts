import { requireAdminPermission, scopedActorId } from "@/admin/action";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listAudit, listAuditQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    const access = await requireAdminPermission("audit.read");
    const query = readQuery(request, listAuditQuery);
    const actorId = scopedActorId(access);
    if (actorId) query.actorId = actorId;
    return Response.json(await listAudit(query));
  } catch (error) {
    return toErrorResponse(error);
  }
}
