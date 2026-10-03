import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

type PendingCookie = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * Refreshes the Supabase session before rendering.
 * Refreshed tokens are written into the request cookies, so the response
 * built afterwards forwards them to Server Components, and `apply` copies
 * them onto that response for the browser.
 */
export async function refreshSession(request: NextRequest) {
  const pending: PendingCookie[] = [];
  const pendingHeaders: Record<string, string> = {};

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        }
        Object.assign(pendingHeaders, headers);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  function apply(response: NextResponse) {
    for (const { name, value, options } of pending) {
      response.cookies.set(name, value, options);
    }
    for (const [key, value] of Object.entries(pendingHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  }

  return { apply, signedIn };
}
