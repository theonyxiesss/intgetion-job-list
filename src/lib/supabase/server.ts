import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authCookieOptions } from "./cookie-options";
import { supabaseAnonKey, supabaseUrl } from "./env";

/**
 * Supabase client for Server Components and Route Handlers. Auth only (D22).
 * Server Components cannot set cookies; the proxy refreshes the session
 * before they render, so a failed write there is safe to ignore.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    // The session is closed to scripts (D314).
    cookieOptions: authCookieOptions(),
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component.
        }
      },
    },
  });
}
