import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botMemoryFactInput } from "@/modules/bot/schemas";
import {
  clearMemory,
  listMemory,
  memoryError,
  rememberFact,
} from "@/modules/bot/service";

async function currentUser() {
  const supabase = await createSupabaseServerClient();
  return requireUser(() => getCurrentUser(supabase.auth));
}

/** `GET /api/bot/memory` — what Spoki remembers about me (D469). */
export async function GET() {
  try {
    const user = await currentUser();
    return Response.json({ facts: await listMemory(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `POST /api/bot/memory` `{ fact }` — add a fact from settings. */
export async function POST(request: Request) {
  try {
    const user = await currentUser();
    const input = await readJson(request, botMemoryFactInput);
    const result = await rememberFact(user.id, input.fact, "site");
    if (!result.ok) throw memoryError(result.reason);
    return Response.json({ fact: result.fact }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/bot/memory` — erase all of it. */
export async function DELETE() {
  try {
    const user = await currentUser();
    return Response.json({ deleted: await clearMemory(user.id) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
