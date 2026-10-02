"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client. Auth only (D22). */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
