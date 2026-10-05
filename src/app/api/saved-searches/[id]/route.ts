import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import {
  deleteSavedSearch,
  patchSavedSearchInput,
  setSearchAlert,
} from "@/modules/saved-searches/service";

type Context = { params: Promise<{ id: string }> };

/** Turns the daily alert of one's own saved search on or off (D233). */
export async function PATCH(request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const { alert } = await readJson(request, patchSavedSearchInput);
    await setSearchAlert(id, user.id, alert);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    await deleteSavedSearch(id, user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
