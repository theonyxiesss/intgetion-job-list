import { HttpError, readJson, toErrorResponse } from "@/lib/http";
import { reportError } from "@/lib/logger";
import { clientIp } from "@/lib/request-ip";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/service";
import { botMessageInput } from "@/modules/bot/schemas";
import {
  handleMessage,
  openServiceConversation,
  openUgcHomeConversation,
  openUgcThread,
  resolveConversation,
  type BotEvent,
} from "@/modules/bot/service";
import { readCampaign } from "@/modules/ugc/service";
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
    const session = sessionToken(request);
    const opened = await openForMessage({
      userId,
      token: session,
      locale,
      from: input.from,
      campaignId: input.campaignId,
      inviteId: input.inviteId,
    });
    const { conversation, token } = opened;
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

async function openForMessage(input: {
  userId: string | null;
  token: string | undefined;
  locale: string;
  from?: "services" | "campaigns";
  campaignId?: string;
  inviteId?: string;
}) {
  if (input.userId && (input.campaignId || input.inviteId)) {
    const campaignId =
      input.campaignId ??
      (await campaignIdForInvite(input.userId, input.inviteId!));
    const view = await readCampaign(input.userId, campaignId);
    return openUgcThread({
      userId: input.userId,
      token: input.token,
      locale: input.locale,
      campaignId: input.campaignId,
      inviteId: input.inviteId,
      productName: view.brief.productName,
    });
  }
  if (input.from === "campaigns") {
    return openUgcHomeConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale,
    });
  }
  if (input.from === "services") {
    return openServiceConversation({
      userId: input.userId,
      token: input.token,
      locale: input.locale,
    });
  }
  return resolveConversation({
    userId: input.userId,
    token: input.token,
    locale: input.locale,
  });
}

async function campaignIdForInvite(userId: string, inviteId: string) {
  const { listMyInvites } = await import("@/modules/ugc/service");
  const rows = await listMyInvites(userId);
  const row = rows.find((item) => item.inviteId === inviteId);
  if (!row) {
    const { notFound } = await import("@/lib/http");
    throw notFound();
  }
  return row.campaignId;
}

