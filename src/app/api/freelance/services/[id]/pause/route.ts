import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { pauseInput, setServicePaused } from "@/modules/freelance/service";

/** `POST /api/freelance/services/:id/pause` `{ paused }` (28.3). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const input = await readJson(request, pauseInput);
    const service = await setServicePaused(user.id, id, input.paused);
    return Response.json({
      service: { id: service.id, status: service.status },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
