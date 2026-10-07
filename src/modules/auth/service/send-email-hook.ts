import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { supabaseUrl } from "@/lib/supabase/env";
import type { EmailSender } from "@/modules/notifications/service/email-sender";
import {
  authEmailKindFromAction,
  authVerifyUrl,
  localeFromAuthUser,
  publicAuthRedirect,
  renderAuthEmail,
} from "./auth-emails";

const payloadSchema = z.object({
  user: z.object({
    email: z.string().email().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  }),
  email_data: z.object({
    token_hash: z.string().min(1),
    email_action_type: z.string().min(1),
    redirect_to: z.string().min(1),
    site_url: z.string().optional(),
  }),
});

/**
 * Standard Webhooks check for Supabase Auth Send Email Hook (D325).
 * Secret looks like `v1,whsec_<base64>` (Dashboard copy) or a bare `whsec_…`.
 */
export function verifySendEmailHookSignature(
  body: string,
  headers: {
    id: string | null;
    timestamp: string | null;
    signature: string | null;
  },
  secret: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  // Reject stale deliveries (5 minutes).
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const key = hookSecretBytes(secret);
  if (!key) return false;
  const signed = `${headers.id}.${headers.timestamp}.${body}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");
  const parts = headers.signature.split(" ");
  for (const part of parts) {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) continue;
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(value);
      if (a.length === b.length && timingSafeEqual(a, b)) return true;
    } catch {
      // Keep looking at other signatures.
    }
  }
  return false;
}

function hookSecretBytes(secret: string): Buffer | null {
  const trimmed = secret.trim();
  const raw = trimmed.includes(",")
    ? trimmed.split(",").pop()!.trim()
    : trimmed;
  const b64 = raw.startsWith("whsec_") ? raw.slice("whsec_".length) : raw;
  try {
    const buf = Buffer.from(b64, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export type SendEmailHookResult =
  { ok: true } | { ok: false; status: 400 | 401 | 503; reason: string };

/**
 * Turns a Supabase Auth send-email hook into a branded Resend letter (D325).
 * Without Resend the hook reports 503 so Auth can retry; wrong secret → 401.
 */
export async function handleSendEmailHook(
  rawBody: string,
  headers: Headers,
  mailer: EmailSender,
  secret = process.env.AUTH_SEND_EMAIL_HOOK_SECRET ?? "",
): Promise<SendEmailHookResult> {
  if (!secret.trim()) {
    return { ok: false, status: 503, reason: "hook_disabled" };
  }
  const valid = verifySendEmailHookSignature(
    rawBody,
    {
      id: headers.get("webhook-id"),
      timestamp: headers.get("webhook-timestamp"),
      signature: headers.get("webhook-signature"),
    },
    secret,
  );
  if (!valid) return { ok: false, status: 401, reason: "bad_signature" };

  let json: unknown;
  try {
    json = JSON.parse(rawBody) as unknown;
  } catch {
    return { ok: false, status: 400, reason: "bad_json" };
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, status: 400, reason: "bad_payload" };
  }
  const { user, email_data: emailData } = parsed.data;
  const to = user.email?.trim();
  if (!to) return { ok: false, status: 400, reason: "no_email" };

  const kind = authEmailKindFromAction(emailData.email_action_type);
  if (!kind) {
    logger.warn(
      { type: emailData.email_action_type },
      "auth send-email hook: unknown action",
    );
    return { ok: false, status: 400, reason: "unknown_action" };
  }

  const locale = localeFromAuthUser(user);
  const actionHref = authVerifyUrl({
    supabaseUrl: supabaseUrl(),
    tokenHash: emailData.token_hash,
    type: emailData.email_action_type,
    redirectTo: publicAuthRedirect(emailData.redirect_to),
  });
  const letter = renderAuthEmail({ kind, locale, actionHref });
  const outcome = await mailer.send({
    to,
    subject: letter.subject,
    html: letter.html,
    text: letter.text,
  });
  if (outcome === "skipped") {
    return { ok: false, status: 503, reason: "email_unavailable" };
  }
  return { ok: true };
}
