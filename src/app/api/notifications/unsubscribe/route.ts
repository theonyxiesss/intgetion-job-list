import { readJson, toErrorResponse } from "@/lib/http";
import { unsubscribeInput } from "@/modules/notifications/schemas";
import { unsubscribeByToken } from "@/modules/notifications/service";

export async function POST(request: Request) {
  try {
    const input = await readJson(request, unsubscribeInput);
    const result = await unsubscribeByToken(input.token);
    return Response.json({ ok: true, type: result.type });
  } catch (error) {
    return toErrorResponse(error);
  }
}
