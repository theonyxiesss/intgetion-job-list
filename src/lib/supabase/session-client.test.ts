import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { refreshSession } from "./proxy";
import { createSessionClient } from "./session-client";
import {
  authStorageKey,
  readStoredSession,
  resetSessionRefreshForTests,
  type IncomingCookie,
} from "./session-refresh";

const URL = "https://projectref.supabase.co";
const KEY = authStorageKey(URL);
const USER = {
  id: "11111111-1111-1111-1111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "ada@example.com",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const saved = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  site: process.env.NEXT_PUBLIC_SITE_URL,
};

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
  resetSessionRefreshForTests();
});

afterEach(() => {
  restore("NEXT_PUBLIC_SUPABASE_URL", saved.url);
  restore("NEXT_PUBLIC_SUPABASE_ANON_KEY", saved.key);
  restore("NEXT_PUBLIC_SITE_URL", saved.site);
  vi.unstubAllGlobals();
});

function restore(name: string, value: string | undefined) {
  // Never delete. A parallel file may still be reading the variable, and
  // wiping it fails unrelated tests with "is not set".
  if (value !== undefined) process.env[name] = value;
}

function session(refreshToken: string, expiresAt: number) {
  return {
    access_token: `access-${refreshToken}`,
    refresh_token: refreshToken,
    expires_in: 3600,
    expires_at: expiresAt,
    token_type: "bearer",
    user: USER,
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function browser() {
  const now = Math.floor(Date.now() / 1000);
  let cookies = [
    { name: KEY, value: JSON.stringify(session("old-refresh", now - 60)) },
  ];
  const writes: IncomingCookie[][] = [];
  return {
    get cookies() {
      return cookies;
    },
    set cookies(next: { name: string; value: string }[]) {
      cookies = next;
    },
    writes,
    client(fetchImpl: typeof fetch, writable = true) {
      return createSessionClient({
        writable,
        fetch: fetchImpl,
        getAll: () => cookies.map((cookie) => ({ ...cookie })),
        setAll: (next) => {
          writes.push(next);
          const map = new Map(
            cookies.map((cookie) => [cookie.name, cookie.value]),
          );
          for (const cookie of next) {
            if (cookie.value === "" || cookie.options?.maxAge === 0) {
              map.delete(cookie.name);
            } else {
              map.set(cookie.name, cookie.value);
            }
          }
          cookies = [...map].map(([name, value]) => ({ name, value }));
        },
      });
    },
  };
}

function cleared(writes: IncomingCookie[][]): boolean {
  return writes
    .flat()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") &&
        (cookie.value === "" || cookie.options?.maxAge === 0),
    );
}

describe("session refresh on the server", () => {
  it("keeps the session when two refreshes of one token overlap", async () => {
    const first = browser();
    const second = browser();
    let refreshCalls = 0;
    let release: () => void = () => {};
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("grant_type=refresh_token")) {
        refreshCalls += 1;
        if (refreshCalls === 1) await hold;
        return json(
          200,
          session("new-refresh", Math.floor(Date.now() / 1000) + 3600),
        );
      }
      if (url.endsWith("/user")) return json(200, USER);
      return json(404, { msg: "no" });
    };

    const pending = Promise.all([
      first.client(fetchImpl).auth.getUser(),
      second.client(fetchImpl).auth.getUser(),
    ]);
    await vi.waitFor(() => expect(refreshCalls).toBe(1));
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(refreshCalls).toBe(1);
    release();
    const [a, b] = await pending;
    expect(refreshCalls).toBe(1);
    expect(a.data.user?.id).toBe(USER.id);
    expect(b.data.user?.id).toBe(USER.id);
    expect(readStoredSession(first.cookies, KEY)?.refresh_token).toBe(
      "new-refresh",
    );
    expect(readStoredSession(second.cookies, KEY)?.refresh_token).toBe(
      "new-refresh",
    );
    expect(cleared(first.writes)).toBe(false);
    expect(cleared(second.writes)).toBe(false);
    for (const cookie of [...first.writes, ...second.writes].flat()) {
      if (!cookie.name.startsWith("sb-") || cookie.value === "") continue;
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 400 * 24 * 60 * 60,
      });
    }
  });

  it("does not wipe a cookie when the refresh cannot reach the network", async () => {
    const jar = browser();
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes("grant_type=refresh_token")) {
        throw new Error("offline");
      }
      return json(404, { msg: "no" });
    };
    const result = await jar.client(fetchImpl).auth.getUser();
    expect(result.data.user).toBeNull();
    expect(cleared(jar.writes)).toBe(false);
    expect(readStoredSession(jar.cookies, KEY)?.refresh_token).toBe(
      "old-refresh",
    );
  });

  it("stays signed in when the refresh was already used and a newer session is in the jar", async () => {
    const jar = browser();
    const newer = session("kept-refresh", Math.floor(Date.now() / 1000) + 3600);
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("grant_type=refresh_token")) {
        jar.cookies = [{ name: KEY, value: JSON.stringify(newer) }];
        return json(400, {
          error_code: "refresh_token_already_used",
          msg: "Invalid Refresh Token: Already Used",
        });
      }
      if (url.endsWith("/user")) return json(200, USER);
      return json(404, { msg: "no" });
    };
    const result = await jar.client(fetchImpl).auth.getUser();
    expect(result.data.user?.id).toBe(USER.id);
    expect(readStoredSession(jar.cookies, KEY)?.refresh_token).toBe(
      "kept-refresh",
    );
    expect(cleared(jar.writes)).toBe(false);
  });

  it("does not sign out when already-used and the jar has not moved on", async () => {
    const jar = browser();
    const fetchImpl: typeof fetch = async (input) => {
      if (String(input).includes("grant_type=refresh_token")) {
        return json(400, {
          error_code: "refresh_token_already_used",
          msg: "Invalid Refresh Token: Already Used",
        });
      }
      return json(404, { msg: "no" });
    };
    await jar.client(fetchImpl).auth.getUser();
    expect(cleared(jar.writes)).toBe(false);
    expect(readStoredSession(jar.cookies, KEY)?.refresh_token).toBe(
      "old-refresh",
    );
  });

  it("does not refresh from a context that cannot write cookies", async () => {
    const jar = browser();
    const fetchImpl = vi.fn(async () => {
      throw new Error("refresh must not be sent");
    });
    await jar.client(fetchImpl, false).auth.getUser();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(readStoredSession(jar.cookies, KEY)?.refresh_token).toBe(
      "old-refresh",
    );
  });

  it("clears this browser on an explicit sign-out and on a dead refresh", async () => {
    const alive = browser();
    alive.cookies = [
      {
        name: KEY,
        value: JSON.stringify(
          session("live-refresh", Math.floor(Date.now() / 1000) + 3600),
        ),
      },
    ];
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (url.includes("/logout")) return new Response(null, { status: 204 });
      return json(404, { msg: "no" });
    };
    const { error } = await alive.client(fetchImpl).auth.signOut({
      scope: "local",
    });
    expect(error).toBeNull();
    expect(urls.some((url) => url.includes("/logout?scope=local"))).toBe(true);
    expect(cleared(alive.writes)).toBe(true);
    expect(readStoredSession(alive.cookies, KEY)).toBeNull();
    for (const cookie of alive.writes.flat()) {
      if (!cookie.name.startsWith("sb-")) continue;
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 0,
      });
    }

    resetSessionRefreshForTests();
    const dead = browser();
    const deadFetch: typeof fetch = async (input) => {
      if (String(input).includes("grant_type=refresh_token")) {
        return json(400, {
          error_code: "refresh_token_not_found",
          msg: "Invalid Refresh Token: Refresh Token Not Found",
        });
      }
      return json(404, { msg: "no" });
    };
    await dead.client(deadFetch).auth.getUser();
    expect(cleared(dead.writes)).toBe(true);
    expect(readStoredSession(dead.cookies, KEY)).toBeNull();
    for (const cookie of dead.writes.flat()) {
      if (!cookie.name.startsWith("sb-") || cookie.value !== "") continue;
      expect(cookie.options?.httpOnly).toBe(true);
      expect(cookie.options?.maxAge).toBe(0);
    }
  });
});

describe("refresh before an API handler", () => {
  it("writes the rotated session onto the response", async () => {
    const now = Math.floor(Date.now() / 1000);
    const request = new NextRequest("http://127.0.0.1:3000/api/me", {
      headers: {
        host: "127.0.0.1:3000",
        cookie: `${KEY}=${encodeURIComponent(JSON.stringify(session("old-refresh", now - 60)))}`,
      },
    });
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("grant_type=refresh_token")) {
        return json(200, session("from-proxy", now + 3600));
      }
      if (url.endsWith("/user")) return json(200, USER);
      return json(404, { msg: "no" });
    };
    vi.stubGlobal("fetch", fetchImpl);
    const { NextResponse } = await import("next/server");
    const sessionResult = await refreshSession(request);
    const response = sessionResult.apply(
      NextResponse.next({ request: { headers: request.headers } }),
    );
    const set = response.headers.getSetCookie().join(";");
    expect(set).toContain(KEY);
    expect(set.toLowerCase()).toContain("httponly");
    expect(set.toLowerCase()).toContain("samesite=lax");
    expect(set).toMatch(/max-age=34560000/i);
  });
});
