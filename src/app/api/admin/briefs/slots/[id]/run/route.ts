import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { readJson, toErrorResponse } from "@/lib/http";
import { runBriefSlotNow } from "@/modules/notifications/service";

const runInput = z.object({ dryRun: z.boolean() });

/**
 * "Run now" (D354). A dry run counts and sends nothing; a live run for a
 * slot day that already had one is refused with 409.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { dryRun } = await readJson(request, runInput);
    const admin = await openAdminAction("jobs_scheduler.run", !dryRun);
    const { id } = await context.params;
    const run = await runBriefSlotNow(id, dryRun);
    await finishAdminAction(request, admin, {
      action: dryRun ? "briefs.run.dry" : "briefs.run.live",
      entityType: "brief_slot",
      entityId: null,
      diff: { slot: id, run },
    });
    return Response.json({ run });
  } catch (error) {
    return toErrorResponse(error);
  }
}
