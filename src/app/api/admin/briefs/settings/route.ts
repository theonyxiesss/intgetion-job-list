import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { readJson, toErrorResponse } from "@/lib/http";
import { setBriefsPaused } from "@/modules/notifications/service";

const settingsInput = z.object({ paused: z.boolean() });

/** The global pause of every morning brief (D354), with an audit row. */
export async function PUT(request: Request) {
  try {
    const admin = await openAdminAction("jobs_scheduler.manage");
    const { paused } = await readJson(request, settingsInput);
    const change = await setBriefsPaused(admin.user.id, paused);
    await finishAdminAction(request, admin, {
      action: "briefs.pause",
      entityType: "brief_settings",
      entityId: null,
      diff: change,
    });
    return Response.json({ paused });
  } catch (error) {
    return toErrorResponse(error);
  }
}
