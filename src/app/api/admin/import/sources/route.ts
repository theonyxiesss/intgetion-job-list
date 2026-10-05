import { requireAdminPermission } from "@/admin/action";
import { toErrorResponse } from "@/lib/http";
import { listImportSources } from "@/modules/ingestion/service";

/** `GET /api/admin/import/sources` — read-only until 8B (D83). */
export async function GET() {
  try {
    await requireAdminPermission("import.manage");
    return Response.json({ sources: await listImportSources() });
  } catch (error) {
    return toErrorResponse(error);
  }
}
