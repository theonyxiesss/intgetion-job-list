import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { reportError } from "@/lib/logger";
import { requireUser } from "@/lib/auth-guards";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botContinueInput } from "@/modules/bot/schemas";
import {
  continueAfterCard,
  goalSessionFromRequest,
  type BotEvent,
} from "@/modules/bot/service";

/**
 * `POST /api/bot/continue` → SSE like `/api/bot/message`: Spoki's own turn
 * right after the person answered a card (D515). Users only.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const user = await requireUser(() => getCurrentUser(supabase.auth));
    const input = await readJson(request, botContinueInput);
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
          await continueAfterCard(
            {
              userId: user.id,
              confirmationId: input.confirmationId,
              ip,
              goalSession: goalSessionFromRequest(request),
            },
            emit,
          );
        } catch (error) {
          if (!(error instanceof HttpError)) reportError(error, "bot_continue");
          emit({
            type: "error",
            code: error instanceof HttpError ? error.code : "INTERNAL",
          });
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
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
