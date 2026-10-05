import { z } from "zod";
import { finishAdminAction, openAdminAction } from "@/admin/action";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { addUserNote, noteInput } from "@/modules/admin-console/service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await openAdminAction("users.note");
    const { id } = await context.params;
    if (!z.uuid().safeParse(id).success) throw notFound();
    const input = await readJson(request, noteInput);
    const note = await addUserNote(admin.user.id, id, input.body);
    await finishAdminAction(request, admin, {
      action: "users.note",
      entityType: "user",
      entityId: id,
      diff: { noteId: note.id },
    });
    return Response.json({ note });
  } catch (error) {
    return toErrorResponse(error);
  }
}
