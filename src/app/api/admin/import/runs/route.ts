import { requireAdmin } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { listImportRuns } from "@/modules/ingestion/service";

/** `GET /api/admin/import/runs` — the latest 50 runs. */
export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ runs: await listImportRuns(50) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
