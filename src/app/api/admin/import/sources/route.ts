import { requireAdmin } from "@/lib/auth-guards";
import { toErrorResponse } from "@/lib/http";
import { listImportSources } from "@/modules/ingestion/service";

/** `GET /api/admin/import/sources` — read-only until 8B (D83). */
export async function GET() {
  try {
    await requireAdmin();
    return Response.json({ sources: await listImportSources() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
