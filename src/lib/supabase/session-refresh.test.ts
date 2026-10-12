import { afterEach, describe, expect, it } from "vitest";
import {
  authStorageKey,
  classifyRefreshFailure,
  coordinateRefresh,
  normalizeSessionCookies,
  newerSessionBody,
  readStoredSession,
  resetSessionRefreshForTests,
  sessionCookieOptions,
  shouldKeepCookies,
} from "./session-refresh";

const KEY = "sb-projectref-auth-token";
const WEEK = 400 * 24 * 60 * 60;

afterEach(() => {
  resetSessionRefreshForTests();
});

describe("classifyRefreshFailure", () => {
  it("keeps the session on a race, a network failure and a 5xx", () => {
    expect(
      classifyRefreshFailure(400, {
        error_code: "refresh_token_already_used",
        msg: "Invalid Refresh Token: Already Used",
      }),
    ).toBe("rotated");
    expect(classifyRefreshFailure(400, { msg: "already been used" })).toBe(
      "rotated",
    );
    expect(classifyRefreshFailure(0, null)).toBe("transient");
    expect(classifyRefreshFailure(503, { msg: "unavailable" })).toBe(
      "transient",
    );
    expect(classifyRefreshFailure(429, { msg: "slow down" })).toBe("transient");
    for (const kind of ["rotated", "transient"] as const) {
      expect(shouldKeepCookies(kind)).toBe(true);
    }
  });

  it("clears only when the refresh is dead or the account is disabled", () => {
    expect(
      classifyRefreshFailure(400, { error_code: "refresh_token_not_found" }),
    ).toBe("dead");
    expect(
      classifyRefreshFailure(400, { error_code: "user_banned", msg: "banned" }),
    ).toBe("disabled");
    expect(shouldKeepCookies("dead")).toBe(false);
    expect(shouldKeepCookies("disabled")).toBe(false);
  });
});

describe("session cookie chunks", () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (saved !== undefined) process.env.NEXT_PUBLIC_SITE_URL = saved;
  });

  it("sets and clears every sb-* chunk with the session flags", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
    const written = normalizeSessionCookies(
      [
        {
          name: `${KEY}.0`,
          value: "aaa",
          options: { httpOnly: false, maxAge: 10 },
        },
        { name: `${KEY}.1`, value: "bbb", options: { httpOnly: false } },
      ],
      [],
      false,
    );
    for (const cookie of written) {
      expect(cookie.options).toMatchObject({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: WEEK,
      });
    }
  });

  it("clears a split cookie the library named only by its base", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
    const written = normalizeSessionCookies(
      [{ name: KEY, value: "", options: { maxAge: 0 } }],
      [
        { name: KEY, value: "old" },
        { name: `${KEY}.0`, value: "part" },
        { name: `${KEY}.1`, value: "rest" },
      ],
      false,
    );
    const names = written.map((cookie) => cookie.name).sort();
    expect(names).toEqual([KEY, `${KEY}.0`, `${KEY}.1`].sort());
    for (const cookie of written) {
      expect(cookie.value).toBe("");
      expect(cookie.options).toMatchObject(sessionCookieOptions(false, true));
      expect(cookie.options?.httpOnly).toBe(true);
      expect(cookie.options?.maxAge).toBe(0);
    }
  });
});

describe("coordinateRefresh", () => {
  it("sends one refresh when two callers share a token", async () => {
    let calls = 0;
    let release: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = () => {
      calls += 1;
      return started.then(() => ({
        status: 200,
        body: JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
          token_type: "bearer",
        }),
      }));
    };
    const first = coordinateRefresh("same-refresh", send, () => null);
    const second = coordinateRefresh("same-refresh", send, () => null);
    await Promise.resolve();
    expect(calls).toBe(1);
    release();
    const [a, b] = await Promise.all([first, second]);
    expect(calls).toBe(1);
    expect(a.body).toBe(b.body);
    expect(a.keepCookies).toBe(false);
    expect(JSON.parse(b.body).refresh_token).toBe("new-refresh");
  });

  it("does not send the same refresh again a moment later", async () => {
    let calls = 0;
    const send = async () => {
      calls += 1;
      return {
        status: 200,
        body: JSON.stringify({
          access_token: "new-access",
          refresh_token: "new-refresh",
          expires_in: 3600,
        }),
      };
    };
    await coordinateRefresh("same-refresh", send, () => null);
    const again = await coordinateRefresh("same-refresh", send, () => null);
    expect(calls).toBe(1);
    expect(JSON.parse(again.body).refresh_token).toBe("new-refresh");
  });

  it("reads a newer session from the jar when the refresh was already used", async () => {
    const body = newerSessionBody(
      [
        {
          name: KEY,
          value: JSON.stringify({
            access_token: "kept-access",
            refresh_token: "kept-refresh",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            token_type: "bearer",
            user: { id: "11111111-1111-1111-1111-111111111111" },
          }),
        },
      ],
      KEY,
      "old-refresh",
    );
    expect(body).not.toBeNull();
    const outcome = await coordinateRefresh(
      "old-refresh",
      async () => ({
        status: 400,
        body: JSON.stringify({
          error_code: "refresh_token_already_used",
          msg: "Invalid Refresh Token: Already Used",
        }),
      }),
      () => body,
    );
    expect(outcome.status).toBe(200);
    expect(JSON.parse(outcome.body).refresh_token).toBe("kept-refresh");
    expect(outcome.keepCookies).toBe(false);
  });

  it("still refreshes a different token", async () => {
    const seen: string[] = [];
    const send = (token: string) => async () => {
      seen.push(token);
      return {
        status: 200,
        body: JSON.stringify({
          access_token: "access",
          refresh_token: `${token}-new`,
          expires_in: 3600,
        }),
      };
    };
    await Promise.all([
      coordinateRefresh("one", send("one"), () => null),
      coordinateRefresh("two", send("two"), () => null),
    ]);
    expect(seen.sort()).toEqual(["one", "two"]);
  });

  it("does not treat the same token still in the jar as a newer session", () => {
    const cookies = [
      {
        name: KEY,
        value: JSON.stringify({
          access_token: "old-access",
          refresh_token: "old-refresh",
          expires_in: 3600,
        }),
      },
    ];
    expect(newerSessionBody(cookies, KEY, "old-refresh")).toBeNull();
    expect(readStoredSession(cookies, KEY)?.refresh_token).toBe("old-refresh");
    expect(authStorageKey("https://projectref.supabase.co")).toBe(KEY);
  });
});
