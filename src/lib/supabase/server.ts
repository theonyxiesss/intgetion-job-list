import { workUnitAsyncStorage } from "next/dist/server/app-render/work-unit-async-storage.external";
import { cookies } from "next/headers";
import { createSessionClient } from "./session-client";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Auth only (D22).
 *
 * A Server Component cannot set cookies. Refreshing there would burn the
 * only refresh token and then throw the new cookie away (D398). The proxy
 * refreshes before a page renders, and route handlers refresh where the
 * write reaches the response. Here a render only reads.
 */
export async function createSupabaseServerClient(
  options: { framed?: boolean } = {},
) {
  const cookieStore = await cookies();
  const writable = requestCookiesAreWritable();
  return createSessionClient({
    framed: options.framed,
    writable,
    getAll: () => cookieStore.getAll(),
    setAll(cookiesToSet) {
      if (!writable) return;
      try {
        for (const { name, value, options: cookieOptions } of cookiesToSet) {
          cookieStore.set(name, value, cookieOptions);
        }
      } catch {
        // The phase can change after the check. A missed write must not
        // become a thrown error on the page; the refresh itself is refused
        // when `writable` is false.
      }
    },
  });
}

/** Route handlers and Server Actions may set cookies. A render may not. */
function requestCookiesAreWritable(): boolean {
  const store = workUnitAsyncStorage.getStore();
  if (!store || store.type !== "request") return false;
  return store.phase === "action";
}
