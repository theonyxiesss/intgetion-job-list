import { z } from "zod";
import { notFound, readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botMemoryFactInput } from "@/modules/bot/schemas";
import { editFact, forgetFact } from "@/modules/bot/service";

type Context = { params: Promise<{ id: string }> };

/** The owner and a valid fact id. Another person's id reads as not found. */
async function target(context: Context) {
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(() => getCurrentUser(supabase.auth));
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) throw notFound();
  return { userId: user.id, id };
}

/** `PATCH /api/bot/memory/:id` `{ fact }` — correct one fact (D469). */
export async function PATCH(request: Request, context: Context) {
  try {
    const { userId, id } = await target(context);
    const input = await readJson(request, botMemoryFactInput);
    return Response.json({ fact: await editFact(userId, id, input.fact) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/bot/memory/:id` — erase one fact. */
export async function DELETE(_request: Request, context: Context) {
  try {
    const { userId, id } = await target(context);
    await forgetFact(userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
