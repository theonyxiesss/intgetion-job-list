import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { reportError } from "@/lib/logger";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botMessageInput } from "@/modules/bot/schemas";
import {
  handleMessage,
  resolveConversation,
  type BotEvent,
} from "@/modules/bot/service";
import { sessionCookie, sessionToken } from "../session-cookie";

/**
 * `POST /api/bot/message` → SSE: `token`, `tool_result`,
 * `confirm_request`, `error`, `done` (D174). Guests and users.
 */
export async function POST(request: Request) {
  try {
    const input = await readJson(request, botMessageInput);
    const supabase = await createSupabaseServerClient();
    const user = await getCurrentUser(supabase.auth);
    const userId = user && user.status === "active" ? user.id : null;
    const locale = input.locale ?? "en";
    const { conversation, token } = await resolveConversation({
      userId,
      token: sessionToken(request),
      locale,
    });
    const ip = clientIp(request.headers);
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const emit = (event: BotEvent) =>
          controller.enqueue(
            encoder.encode(
              `event: ${event.type}
data: ${JSON.stringify(event)}

`,
            ),
          );
        try {
          await handleMessage(
            { userId, conversation, text: input.text, ip, locale },
            emit,
          );
        } catch (error) {
          if (!(error instanceof HttpError)) reportError(error, "bot_message");
          emit({
            type: "error",
            code: error instanceof HttpError ? error.code : "INTERNAL",
          });
          emit({ type: "done", conversationId: conversation.id });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        "x-accel-buffering": "no",
        "set-cookie": sessionCookie(token),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
