import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { readJson, toErrorResponse } from "@/lib/http";
import { updateBriefSlot } from "@/modules/notifications/service";

const slotInput = z.object({
  timezone: z.string().min(1).max(64),
  localTime: z.string(),
  enabled: z.boolean(),
});

/** Moves or pauses one morning slot (D354); the change goes to audit_log. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("jobs_scheduler.manage");
    const { id } = await context.params;
    const input = await readJson(request, slotInput);
    const { before, after } = await updateBriefSlot(admin.user.id, id, input);
    await finishAdminAction(request, admin, {
      action: "briefs.slot.update",
      entityType: "brief_slot",
      entityId: null,
      diff: { slot: id, before, after },
    });
    return Response.json({ slot: after });
  } catch (error) {
    return toErrorResponse(error);
  }
}
