import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { clientIp } from "@/lib/request-ip";
import { suspendUser, userActionInput } from "@/modules/admin/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.suspend", true);
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, userActionInput);
    const user = await suspendUser(
      admin.user,
      id,
      input,
      clientIp(request.headers),
    );
    await finishAdminAction(request, admin, {
      action: "users.suspend",
      entityType: "user",
      entityId: id,
      reason: input.note ?? null,
    });
    return Response.json({ user });
  } catch (error) {
    return toErrorResponse(error);
  }
}
