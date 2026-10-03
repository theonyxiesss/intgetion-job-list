/** Request id shared by the proxy, route handlers and logs (18.1). */
export const REQUEST_ID_HEADER = "x-request-id";

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;

/** A client-sent id is kept only when it looks like one; otherwise a new one. */
export function normalizeRequestId(value: string | null): string {
  return value && REQUEST_ID.test(value) ? value : crypto.randomUUID();
}
