import { REQUEST_ID_HEADER } from "@/lib/request-id";

/**
 * What a failed auth request means for the person (D606). `code` is a key
 * of `auth.errors`; `requestId` is the `x-request-id` of the answer, shown
 * so a support request can be matched to the server log line.
 */
export type AuthFailure = { code: string; requestId?: string };

type ErrorBody = { error?: { code?: string; details?: unknown } };

/** Maps a JSON error body (section 6) to an `auth.errors` key. */
export function errorCodeOf(body: ErrorBody | null): string {
  const error = body?.error;
  const details = error?.details;
  if (error?.code === "VALIDATION_ERROR" && Array.isArray(details)) {
    const message = (details[0] as { message?: string } | undefined)?.message;
    if (message) return message;
  }
  if (error?.code === "AUTH_UNAVAILABLE") return "auth_unavailable";
  if (error?.code === "UNAUTHENTICATED") {
    const reason = (details as { reason?: string } | undefined)?.reason;
    return reason ?? "invalid_credentials";
  }
  if (error?.code === "EMAIL_ALREADY_REGISTERED") {
    return "email_already_registered";
  }
  if (error?.code === "RATE_LIMITED") return "rate_limited";
  return "generic";
}

/**
 * Three cases kept apart: the request never reached us (`network`), Auth
 * is down for everyone (`auth_unavailable`), or the answer is about this
 * person's input (`invalid_credentials` and the rest).
 */
export async function authFailureOf(
  response: Response | null,
): Promise<AuthFailure> {
  if (!response) return { code: "network" };
  const requestId = response.headers.get(REQUEST_ID_HEADER) ?? undefined;
  let body: ErrorBody | null = null;
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    body = null;
  }
  const code = errorCodeOf(body);
  // The id matters when the fault is ours, not for a typo in a field.
  const withId = code === "auth_unavailable" || response.status >= 500;
  return withId && requestId ? { code, requestId } : { code };
}

/** POST JSON; a network failure resolves to null instead of throwing. */
export function postJson(path: string, body?: unknown) {
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => null);
}
