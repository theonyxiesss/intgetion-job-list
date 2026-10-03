import { requireAdmin } from "@/lib/auth-guards";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listSuggestions, listSuggestionsQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    return Response.json(
      await listSuggestions(readQuery(request, listSuggestionsQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
