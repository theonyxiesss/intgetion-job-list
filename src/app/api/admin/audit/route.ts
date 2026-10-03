import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listAudit, listAuditQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(await listAudit(readQuery(request, listAuditQuery)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
