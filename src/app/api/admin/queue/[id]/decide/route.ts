import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { decideInput, decideQueueItem } from "@/modules/moderation/service";

/** `POST /api/admin/queue/:id/decide` `{ decision, note }` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("moderation.decide", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, decideInput);
    const item = await decideQueueItem(
      admin.user,
      id,
      input,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "moderation.decide",
      entityType: "moderation_item",
      entityId: id,
      reason: input.note ?? null,
    });
    return Response.json({ item });
  } catch (error) {
    return toErrorResponse(error);
  }
}
