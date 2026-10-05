import { requireAdminPermission } from "@/admin/action";
import { readQuery, toErrorResponse } from "@/lib/http";
import { listSuggestions, listSuggestionsQuery } from "@/modules/admin/service";

export async function GET(request: Request) {
  try {
    await requireAdminPermission("taxonomy.manage");
    return Response.json(
      await listSuggestions(readQuery(request, listSuggestionsQuery)),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
