import { notFound, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import {
  deleteMyConversation,
  openMyConversation,
} from "@/modules/bot/service";
import { sessionCookie } from "../../session-cookie";

const ID = /^[0-9a-f-]{36}$/i;

async function owner(context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!ID.test(id)) throw notFound();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser(() => getCurrentUser(supabase.auth));
  return { id, userId: user.id };
}

/** `POST /api/bot/conversations/:id` — continue one of your dialogues. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id, userId } = await owner(context);
    const { token } = await openMyConversation(userId, id);
    return Response.json(
      { conversationId: id },
      {
        headers: {
          "set-cookie": sessionCookie(token),
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** `DELETE /api/bot/conversations/:id` — removes one of your dialogues. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id, userId } = await owner(context);
    await deleteMyConversation(userId, id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
