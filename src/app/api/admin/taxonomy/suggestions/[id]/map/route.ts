import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { mapSuggestion, mapSuggestionInput } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("taxonomy.manage", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const { skillId } = await readJson(request, mapSuggestionInput);
    const suggestion = await mapSuggestion(
      admin.user,
      id,
      skillId,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "taxonomy.manage",
      entityType: "skill_suggestion",
      entityId: id,
    });
    return Response.json({ suggestion });
  } catch (error) {
    return toErrorResponse(error);
  }
}
