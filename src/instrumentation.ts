import type { Instrumentation } from "next";

/**
 * Server errors to Sentry over its envelope endpoint, without the SDK (D197).
 * Off unless SENTRY_DSN is set. Sends the message, the digest, the method
 * and the path without its query string — no headers, bodies or user data.
 */

type Dsn = { endpoint: string; publicKey: string };

export function parseDsn(dsn: string): Dsn | null {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\/+|\/+$/g, "");
    if (!url.username || !projectId) return null;
    return {
      endpoint: `${url.protocol}//${url.host}/api/${projectId}/envelope/`,
      publicKey: url.username,
    };
  } catch {
    return null;
  }
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
) => {
  const dsn = process.env.SENTRY_DSN?.trim();
  const parsed = dsn ? parseDsn(dsn) : null;
  if (!dsn || !parsed) return;

  const message = error instanceof Error ? error.message : String(error);
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String(error.digest)
      : undefined;
  const requestId = request.headers["x-request-id"];
  const event = {
    event_id: crypto.randomUUID().replaceAll("-", ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    message,
    tags: {
      method: request.method,
      path: request.path.split("?")[0],
      ...(digest ? { digest } : {}),
      ...(typeof requestId === "string" ? { request_id: requestId } : {}),
    },
  };
  const envelope = [
    JSON.stringify({ event_id: event.event_id, dsn }),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    await fetch(parsed.endpoint, {
      method: "POST",
      body: envelope,
      headers: {
        "content-type": "application/x-sentry-envelope",
        "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${parsed.publicKey}`,
      },
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    // Reporting must never turn one error into two.
  }
};
