import { requireAdminPermission } from "@/admin/action";
import { toErrorResponse } from "@/lib/http";
import { listImportRuns } from "@/modules/ingestion/service";

/** `GET /api/admin/import/runs` — the latest 50 runs. */
export async function GET() {
  try {
    await requireAdminPermission("import.manage");
    return Response.json({ runs: await listImportRuns(50) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
