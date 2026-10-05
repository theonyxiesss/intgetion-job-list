import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

type PendingCookie = { name: string; value: string; options?: CookieOptions };

function cookiesFrom(request: Request): { name: string; value: string }[] {
  const header = request.headers.get("cookie");
  if (!header) return [];
  return header
    .split(";")
    .map((part) => {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq <= 0) return null;
      return {
        name: trimmed.slice(0, eq),
        value: trimmed.slice(eq + 1),
      };
    })
    .filter(
      (cookie): cookie is { name: string; value: string } => cookie !== null,
    );
}

/** Auth client whose cookie writes land on the response we return. */
export function bindSupabase(request: Request) {
  const pending: PendingCookie[] = [];
  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookiesFrom(request);
      },
      setAll(cookiesToSet) {
        pending.splice(0, pending.length, ...cookiesToSet);
      },
    },
  });
  return {
    supabase,
    apply(response: NextResponse) {
      for (const cookie of pending) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return response;
    },
  };
}
