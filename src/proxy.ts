import createMiddleware from "next-intl/middleware";
import { type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { refreshSession } from "./lib/supabase/proxy";

const handleI18nRouting = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  // Refresh first: next-intl copies the request headers when it builds the response.
  const applySession = await refreshSession(request);
  return applySession(handleI18nRouting(request));
}

export const config = {
  matcher: "/((?!api|_next|_vercel|.*\..*).*)",
};
