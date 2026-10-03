import { readQuery, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { listNotificationsQuery } from "@/modules/notifications/schemas";
import { listNotifications } from "@/modules/notifications/service";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const query = readQuery(request, listNotificationsQuery);
    return Response.json(
      await listNotifications(user.id, {
        cursor: query.cursor,
        limit: query.limit,
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
