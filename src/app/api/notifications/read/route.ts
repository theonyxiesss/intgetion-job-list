import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { markReadInput } from "@/modules/notifications/schemas";
import { markNotificationsRead } from "@/modules/notifications/service";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, markReadInput);
    if ("all" in input) {
      await markNotificationsRead(user.id, { all: true });
    } else {
      await markNotificationsRead(user.id, { ids: input.ids });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
