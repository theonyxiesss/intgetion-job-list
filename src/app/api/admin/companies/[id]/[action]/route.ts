import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { notFound, toErrorResponse } from "@/lib/http";
import { suspendCompany, unsuspendCompany } from "@/modules/admin/service";

const actions = { suspend: suspendCompany, unsuspend: unsuspendCompany };

/** `POST /api/admin/companies/:id/suspend` and `.../unsuspend` (section 7). */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; action: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id, action } = await context.params;
    const run = actions[action as keyof typeof actions];
    if (!run || !z.uuid().safeParse(id).success) throw notFound();
    return Response.json({ company: await run(admin, id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
