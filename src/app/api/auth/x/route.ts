import { redirectToOAuth } from "../oauth-redirect";

/** Starts X sign-in and comes back through `/auth/callback` (D336). */
export function GET(request: Request) {
  return redirectToOAuth(request, "x");
}
