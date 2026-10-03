import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { writePreferencesInput } from "@/modules/notifications/schemas";
import {
  readPreferences,
  writePreferences,
} from "@/modules/notifications/service";

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json({ preferences: await readPreferences(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, writePreferencesInput);
    await writePreferences(user.id, input.preferences);
    return Response.json({ preferences: await readPreferences(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
