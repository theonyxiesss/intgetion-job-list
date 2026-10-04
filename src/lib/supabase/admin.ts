import { logger } from "@/lib/logger";
import { supabaseUrl } from "./env";

/**
 * Supabase Auth Admin API over plain fetch, with the service-role key
 * (server only, never NEXT_PUBLIC_*). Without the key every call reports
 * "unavailable" instead of throwing, so callers degrade predictably (D166).
 */

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
    return body.email?.trim() || null;
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
