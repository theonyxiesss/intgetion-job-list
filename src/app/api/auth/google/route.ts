import { redirectToOAuth } from "../oauth-redirect";

/** Starts Google sign-in and comes back through `/auth/callback` (D335). */
export function GET(request: Request) {
  return redirectToOAuth(request, "google");
}
