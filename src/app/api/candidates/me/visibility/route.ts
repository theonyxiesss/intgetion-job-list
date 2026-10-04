import { z } from "zod";
import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import { setProfileHidden } from "@/modules/candidates/service";

const input = z.object({ hidden: z.boolean() }).strict();

/** `PUT /api/candidates/me/visibility` `{ hidden }` (10C, /settings/privacy). */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const { hidden } = await readJson(request, input);
    return Response.json({ hidden: await setProfileHidden(user.id, hidden) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
