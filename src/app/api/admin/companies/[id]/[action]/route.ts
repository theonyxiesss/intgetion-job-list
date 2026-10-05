import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, toErrorResponse } from "@/lib/http";
import { suspendCompany, unsuspendCompany } from "@/modules/admin/service";

const actions = { suspend: suspendCompany, unsuspend: unsuspendCompany };

/** `POST /api/admin/companies/:id/suspend` and `.../unsuspend` (section 7). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const admin = await openAdminAction("companies.suspend", true);
    const { id, action } = await context.params;
    const run = actions[action as keyof typeof actions];
    if (!run || !z.uuid().safeParse(id).success) throw notFound();
    const company = await run(admin.user, id);
    await finishAdminAction(request, admin, {
      action: "companies.suspend",
      entityType: "company",
      entityId: id,
      diff: { action },
    });
    return Response.json({ company });
  } catch (error) {
    return toErrorResponse(error);
  }
}
