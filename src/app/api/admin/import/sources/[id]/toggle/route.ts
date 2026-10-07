import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { setImportSourceEnabled } from "@/modules/ingestion/service";

const toggleInput = z.object({ enabled: z.boolean() });

/** `POST /api/admin/import/sources/:id/toggle` `{ enabled }` (8B, D349). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("import.manage");
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const { enabled } = await readJson(request, toggleInput);
    const source = await setImportSourceEnabled(id, enabled);
    if (!source) throw notFound();
    await finishAdminAction(request, admin, {
      action: "import.source_toggle",
      entityType: "import_source",
      entityId: id,
      diff: { name: source.name, enabled },
    });
    return Response.json({ source });
  } catch (error) {
    return toErrorResponse(error);
  }
}
