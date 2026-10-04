import { logger } from "@/lib/logger";
import { supabaseUrl } from "./env";

/**
 * Supabase Auth Admin API over plain fetch, with the service-role key
 * (server only, never NEXT_PUBLIC_*). Without the key every call reports
 * "unavailable" instead of throwing, so callers degrade predictably (D166).
 */

/**
 * Login emails on this domain are placeholders for users without an email
 * (Telegram sign-in, D217). No mail is sent there: the lookup returns null.
 */
export const PLACEHOLDER_EMAIL_DOMAIN = "telegram.intgetion.com";

export function isPlaceholderEmail(email: string): boolean {
  return email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);
}

function serviceKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null;
}

export function authAdminAvailable(): boolean {
  return serviceKey() !== null;
}

async function adminFetch(path: string, init?: RequestInit) {
  const key = serviceKey();
  if (!key) return null;
  return fetch(`${supabaseUrl()}/auth/v1/admin${path}`, {
    ...init,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      ...init?.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
}

/** Login email of an auth user; null when unknown or the key is missing. */
export async function getAuthUserEmail(
  authUid: string,
): Promise<string | null> {
  try {
    const response = await adminFetch(`/users/${encodeURIComponent(authUid)}`);
    if (!response?.ok) return null;
    const body = (await response.json()) as { email?: string | null };
    const email = body.email?.trim() || null;
    return email && !isPlaceholderEmail(email) ? email : null;
  } catch (error) {
    logger.warn({ err: error }, "auth admin: email lookup failed");
    return null;
  }
}

/**
 * Deletes the auth user (D28). Returns "deleted", "missing" (already gone),
 * "unavailable" (no key) or "failed" — the caller has already anonymised
 * the profile, so a failure is logged and retried by the retention cron.
 */
export async function deleteAuthUser(
  authUid: string,
): Promise<"deleted" | "missing" | "unavailable" | "failed"> {
  try {
    const response = await adminFetch(`/users/${encodeURIComponent(authUid)}`, {
      method: "DELETE",
    });
    if (!response) return "unavailable";
    if (response.ok) return "deleted";
    if (response.status === 404) return "missing";
    logger.warn(
      { status: response.status },
      "auth admin: user delete was refused",
    );
    return "failed";
  } catch (error) {
    logger.warn({ err: error }, "auth admin: user delete failed");
    return "failed";
  }
}

/**
 * Creates an auth user with a confirmed email and no password (D217).
 * "exists" when the email is already taken: the caller signs that user in.
 */
export async function createConfirmedAuthUser(
  email: string,
  userMetadata: Record<string, unknown>,
): Promise<"created" | "exists" | "unavailable" | "failed"> {
  try {
    const response = await adminFetch("/users", {
      method: "POST",
      body: JSON.stringify({
        email,
        email_confirm: true,
        user_metadata: userMetadata,
      }),
    });
    if (!response) return "unavailable";
    if (response.ok) return "created";
    const body = (await response.json().catch(() => ({}))) as {
      error_code?: string;
      code?: string;
    };
    const code = body.error_code ?? body.code;
    if (response.status === 422 && code === "email_exists") return "exists";
    logger.warn(
      { status: response.status, code },
      "auth admin: create refused",
    );
    return "failed";
  } catch (error) {
    logger.warn({ err: error }, "auth admin: create failed");
    return "failed";
  }
}

/**
 * A one-time sign-in token for an existing user, without sending an email.
 * The server turns it into a session with `verifyOtp` (D217).
 */
export async function magicLinkTokenHash(
  email: string,
): Promise<string | null> {
  try {
    const response = await adminFetch("/generate_link", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email }),
    });
    if (!response?.ok) {
      logger.warn({ status: response?.status }, "auth admin: link refused");
      return null;
    }
    const body = (await response.json()) as { hashed_token?: string };
    return body.hashed_token || null;
  } catch (error) {
    logger.warn({ err: error }, "auth admin: link failed");
    return null;
  }
}
