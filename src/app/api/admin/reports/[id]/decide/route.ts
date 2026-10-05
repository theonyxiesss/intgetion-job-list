import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { decideReport, decideReportInput } from "@/modules/moderation/service";

/** `POST /api/admin/reports/:id/decide` `{ decision, note }` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("reports.decide", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, decideReportInput);
    const report = await decideReport(
      admin.user,
      id,
      input,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "reports.decide",
      entityType: "report",
      entityId: id,
      reason: input.note ?? null,
    });
    return Response.json({ report });
  } catch (error) {
    return toErrorResponse(error);
  }
}
