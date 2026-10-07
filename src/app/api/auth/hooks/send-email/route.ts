import { toErrorResponse } from "@/lib/http";
import { handleSendEmailHook } from "@/modules/auth/service/send-email-hook";
import { senderFromEnv } from "@/modules/notifications/service/email-sender";

/**
 * Supabase Auth Send Email Hook (D325): Auth hands us the letter; we send a
 * branded HTML message through Resend. CSRF is skipped — Auth has no Origin;
 * the Standard Webhooks signature is the gate.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const result = await handleSendEmailHook(
      rawBody,
      request.headers,
      senderFromEnv(),
    );
    if (!result.ok) {
      return Response.json(
        { error: { code: result.reason } },
        { status: result.status },
      );
    }
    return Response.json({});
  } catch (error) {
    return toErrorResponse(error);
  }
}
