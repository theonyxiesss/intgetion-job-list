import { requireUser } from "@/lib/auth-guards";
import { readJson, toErrorResponse } from "@/lib/http";
import {
  createSavedSearchInput,
  saveSearch,
} from "@/modules/saved-searches/service";

/** Saves the current catalog search (D233). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const search = await saveSearch(
      user.id,
      await readJson(request, createSavedSearchInput),
    );
    return Response.json({ search }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
