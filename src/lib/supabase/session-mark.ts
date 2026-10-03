/**
 * The proxy already asks Supabase whether there is a session; it passes the
 * answer to Server Components in this request header so the header does not
 * ask again (D41). Display only: authorization still goes through getUser().
 */
export const SESSION_HEADER = "x-intgetion-session";

/** Overwrites whatever the client sent under this name. */
export function markSession(headers: Headers, signedIn: boolean): void {
  headers.set(SESSION_HEADER, signedIn ? "1" : "0");
}

export function hasSessionMark(headers: Headers): boolean {
  return headers.get(SESSION_HEADER) === "1";
}
