import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Local dev account without Supabase Auth (no Docker on the dev machine).
 *
 * With `pnpm dev` and `DEV_AUTH_USER=<auth uid>` in `.env.local`, every
 * server session lookup (`auth.getUser`, `auth.getClaims`) answers with that
 * user. The app then finds the `users` row by `auth_uid` as usual.
 *
 * Never on a deployment: it needs NODE_ENV "development" (a production build
 * is always "production") and refuses on Vercel (`VERCEL` / `VERCEL_ENV`).
 */

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DEV_AUTH_EMAIL = "dev@intgetion.test";

type Env = Record<string, string | undefined>;

/** The dev auth uid when the bypass may run here, else null. */
export function devAuthUid(env: Env = process.env): string | null {
  if (env.NODE_ENV !== "development") return null;
  if (env.VERCEL || env.VERCEL_ENV) return null;
  const uid = env.DEV_AUTH_USER?.trim();
  if (!uid || !UUID.test(uid)) return null;
  return uid.toLowerCase();
}

function devUser(uid: string): User {
  const now = new Date().toISOString();
  return {
    id: uid,
    aud: "authenticated",
    role: "authenticated",
    email: DEV_AUTH_EMAIL,
    email_confirmed_at: now,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    identities: [],
    created_at: now,
  };
}

/** Answers session lookups on `client` with the dev user. */
export function withDevAuth(
  client: SupabaseClient,
  uid: string,
): SupabaseClient {
  const user = devUser(uid);
  const auth = client.auth as unknown as Record<string, unknown>;
  auth.getUser = async () => ({ data: { user }, error: null });
  auth.getClaims = async () => ({
    data: {
      claims: {
        sub: uid,
        aud: "authenticated",
        role: "authenticated",
        email: DEV_AUTH_EMAIL,
      },
      header: { alg: "none", typ: "JWT" },
      signature: new Uint8Array(),
    },
    error: null,
  });
  return client;
}
