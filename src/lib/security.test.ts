import { afterEach, describe, expect, it } from "vitest";
import { rateLimited } from "@/lib/http";
import { authCookieOptions } from "./supabase/cookie-options";
import { isAllowedOrigin, needsOriginCheck } from "./origin";
import { privacyHash } from "./privacy-hash";
import { retryAfterSeconds, windowStart } from "./rate-limit";
import { clientIp } from "./request-ip";
import { buildCsp, createNonce } from "./security-headers";

const site = "http://127.0.0.1:3000";

describe("needsOriginCheck (D313)", () => {
  it("skips the CSRF rule only for the Telegram webhook", () => {
    // Telegram sends no Origin at all; the route checks its secret instead.
    expect(needsOriginCheck("/api/telegram/webhook")).toBe(false);
    expect(isAllowedOrigin("POST", null, site)).toBe(false);
  });

  it("keeps every other API route behind the rule", () => {
    for (const path of [
      "/api/bot/message",
      "/api/auth/telegram/start",
      "/api/admin/users/1/ban",
      "/api/telegram/webhook/extra",
      "/api/cron/import",
    ]) {
      expect(needsOriginCheck(path), path).toBe(true);
    }
  });
});

describe("isAllowedOrigin (P12)", () => {
  it("lets safe methods through without an Origin", () => {
    expect(isAllowedOrigin("GET", null, site)).toBe(true);
    expect(isAllowedOrigin("HEAD", "https://evil.example", site)).toBe(true);
  });

  it("accepts mutating requests from the site origin", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(isAllowedOrigin(method, "http://127.0.0.1:3000", site)).toBe(true);
    }
  });

  it("refuses foreign, look-alike, missing and malformed origins", () => {
    expect(isAllowedOrigin("POST", "https://evil.example", site)).toBe(false);
    expect(isAllowedOrigin("POST", "http://127.0.0.1:3001", site)).toBe(false);
    expect(isAllowedOrigin("POST", "https://127.0.0.1:3000", site)).toBe(false);
    expect(isAllowedOrigin("POST", null, site)).toBe(false);
    expect(isAllowedOrigin("PATCH", "null", site)).toBe(false);
  });
});

describe("buildCsp", () => {
  const csp = buildCsp({
    nonce: "abc123",
    supabaseUrl: "https://ref.supabase.co/",
    isDev: false,
  });

  it("follows section 16.1", () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'nonce-abc123'");
    expect(csp).toContain("img-src 'self' data: https://ref.supabase.co");
    expect(csp).toContain("connect-src 'self' https://ref.supabase.co");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it("allows eval only in development", () => {
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unsafe-inline");
    expect(
      buildCsp({
        nonce: "n",
        supabaseUrl: "http://127.0.0.1:54321",
        isDev: true,
      }),
    ).toContain("'unsafe-eval'");
  });

  it("makes a fresh nonce each time", () => {
    expect(createNonce()).not.toBe(createNonce());
  });
});

describe("fixed windows", () => {
  const rule = { limit: 5, windowSeconds: 900 };

  it("aligns windows to multiples of their length", () => {
    expect(
      windowStart(new Date("2026-10-03T10:14:59Z"), 900).toISOString(),
    ).toBe("2026-10-03T10:00:00.000Z");
    expect(
      windowStart(new Date("2026-10-03T10:15:00Z"), 900).toISOString(),
    ).toBe("2026-10-03T10:15:00.000Z");
  });

  it("asks to retry when the current window ends", () => {
    expect(retryAfterSeconds(new Date("2026-10-03T10:14:00Z"), rule)).toBe(60);
    expect(retryAfterSeconds(new Date("2026-10-03T10:14:59.500Z"), rule)).toBe(
      1,
    );
  });
});

describe("rateLimited (P15)", () => {
  it("is a 429 RATE_LIMITED with a Retry-After header", async () => {
    const error = rateLimited(42);
    expect(error.status).toBe(429);
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.headers).toEqual({ "Retry-After": "42" });
  });
});

describe("privacyHash", () => {
  it("is keyed, stable and case-insensitive", () => {
    const a = privacyHash("Ana@Example.com", "k1");
    expect(a).toBe(privacyHash(" ana@example.com ", "k1"));
    expect(a).not.toBe(privacyHash("ana@example.com", "k2"));
    expect(a).not.toContain("ana");
    expect(a).toHaveLength(32);
  });

  it("refuses to run without a secret", () => {
    expect(() => privacyHash("x", "")).toThrow("PRIVACY_HASH_SECRET");
  });
});

describe("clientIp", () => {
  it("takes the first forwarded address", () => {
    expect(
      clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" })),
    ).toBe("203.0.113.7");
    expect(clientIp(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("Mini App framing (D259)", () => {
  it("lets Telegram frame the site only when asked", () => {
    const closed = buildCsp({
      nonce: "abc",
      supabaseUrl: "https://example.supabase.co",
      isDev: false,
    });
    expect(closed).toContain("frame-ancestors 'none'");
    const open = buildCsp({
      nonce: "abc",
      supabaseUrl: "https://example.supabase.co",
      isDev: false,
      allowTelegramFrame: true,
    });
    expect(open).toContain("https://web.telegram.org");
    expect(open).not.toContain("frame-ancestors 'none'");
    // Nothing else loosens up.
    expect(open).toContain("script-src 'self' 'nonce-abc'");
    expect(open).toContain("object-src 'none'");
  });
});

describe("session cookies (D314)", () => {
  const saved = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = saved;
  });

  it("keeps the session for 400 days and out of reach of scripts", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
    expect(authCookieOptions()).toEqual({
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure: true,
      maxAge: 400 * 24 * 60 * 60,
    });
  });

  it("drops Secure when the site is not served over https", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "http://127.0.0.1:3000";
    expect(authCookieOptions().secure).toBe(false);
    expect(authCookieOptions().httpOnly).toBe(true);
  });
});
