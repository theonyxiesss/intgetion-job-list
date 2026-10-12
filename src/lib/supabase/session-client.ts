import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { authCookieOptions } from "./cookie-options";
import { supabaseAnonKey, supabaseUrl } from "./env";
import {
  authStorageKey,
  coordinateRefresh,
  isSessionClear,
  newerSessionBody,
  normalizeSessionCookies,
  type IncomingCookie,
} from "./session-refresh";

type CookieWrite = (
  cookies: IncomingCookie[],
  headers: Record<string, string>,
) => void;

/**
 * Server Supabase client whose refresh cannot sign the browser out by
 * accident (D398).
 *
 * `writable` is false in a Server Component: `cookies().set` throws there,
 * so a refresh would burn the only refresh token and the new cookie would
 * never be saved. The proxy and route handlers pass `writable: true`.
 */
export function createSessionClient(input: {
  framed?: boolean;
  writable: boolean;
  getAll: () => { name: string; value: string }[];
  setAll: CookieWrite;
  fetch?: typeof fetch;
}): SupabaseClient {
  const framed = input.framed === true;
  const gate = { keepCookies: false, explicitSignOut: false };
  const baseFetch = input.fetch ?? ((...args) => fetch(...args));
  const storageKey = authStorageKey(supabaseUrl());

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookieOptions: authCookieOptions(framed ? { framed: true } : {}),
    global: {
      fetch: async (requestInput, init) => {
        const url = requestUrl(requestInput);
        if (url.includes("/logout")) {
          gate.explicitSignOut = true;
          gate.keepCookies = false;
        }
        if (!isRefreshGrant(url)) return baseFetch(requestInput, init);

        const refreshToken = refreshTokenFrom(init);
        if (!input.writable) {
          // Do not call the token endpoint. Nothing could be written back.
          gate.keepCookies = true;
          return jsonResponse(400, {
            error_code: "refresh_transient",
            msg: "refresh not written",
          });
        }
        if (!refreshToken) return baseFetch(requestInput, init);

        const outcome = await coordinateRefresh(
          refreshToken,
          async () => {
            try {
              const response = await baseFetch(requestInput, init);
              return { status: response.status, body: await response.text() };
            } catch {
              return {
                status: 400,
                body: JSON.stringify({
                  error_code: "refresh_transient",
                  msg: "network",
                }),
              };
            }
          },
          () => newerSessionBody(input.getAll(), storageKey, refreshToken),
        );
        gate.keepCookies = outcome.keepCookies;
        return new Response(outcome.body, {
          status: outcome.status,
          headers: { "content-type": "application/json" },
        });
      },
    },
    cookies: {
      getAll() {
        return input.getAll();
      },
      setAll(cookiesToSet, headers) {
        if (!input.writable) return;
        let next = normalizeSessionCookies(
          cookiesToSet,
          input.getAll(),
          framed,
        );
        if (gate.keepCookies && !gate.explicitSignOut) {
          next = next.filter(
            (cookie) =>
              !(cookie.name.startsWith("sb-") && isSessionClear(cookie)),
          );
        }
        if (next.length === 0) return;
        input.setAll(next, headers);
      },
    },
  });
}

function isRefreshGrant(url: string): boolean {
  return url.includes("/token") && url.includes("grant_type=refresh_token");
}

function refreshTokenFrom(init?: RequestInit): string | null {
  if (!init?.body || typeof init.body !== "string") return null;
  try {
    const parsed = JSON.parse(init.body) as { refresh_token?: unknown };
    return typeof parsed.refresh_token === "string"
      ? parsed.refresh_token
      : null;
  } catch {
    return null;
  }
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
