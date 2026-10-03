import { describe, expect, it } from "vitest";
import { rateLimited } from "@/lib/http";
import { isAllowedOrigin } from "./origin";
import { privacyHash } from "./privacy-hash";
import { retryAfterSeconds, windowStart } from "./rate-limit";
import { clientIp } from "./request-ip";
import { buildCsp, createNonce } from "./security-headers";

const site = "http://127.0.0.1:3000";

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
