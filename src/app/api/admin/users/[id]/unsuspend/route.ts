import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { unsuspendUser, userActionInput } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.unsuspend", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, userActionInput);
    const user = await unsuspendUser(
      admin.user,
      id,
      input,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "users.unsuspend",
      entityType: "user",
      entityId: id,
      reason: input.note ?? null,
    });
    return Response.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
