import { HttpError, readQuery, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { matchListLimit, matchListQuery } from "@/modules/matching/schemas";
import { listMatchPage } from "@/modules/matching/service";

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const query = readQuery(request, matchListQuery);
    const page = await listMatchPage(user.id, {
      cursor: query.cursor,
      limit: matchListLimit(query.limit),
      locale: user.locale,
    });
    return Response.json(page);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_cursor") {
      return toErrorResponse(
        new HttpError(400, "VALIDATION_ERROR", "Invalid page cursor"),
      );
    }
    return toErrorResponse(error);
  }
}
