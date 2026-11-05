import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  checkAuthHealth,
  isAuthOutageStatus,
  resetAuthHealthCache,
} from "./auth-health";

describe("isAuthOutageStatus (D606)", () => {
  it("402, 5xx and no answer are an outage", () => {
    for (const status of [0, 402, 500, 502, 503, 504]) {
      expect(isAuthOutageStatus(status)).toBe(true);
    }
  });

  it("the person's own errors and limits are not", () => {
    for (const status of [undefined, 400, 401, 403, 422, 429]) {
      expect(isAuthOutageStatus(status)).toBe(false);
    }
  });
});

describe("checkAuthHealth (D606)", () => {
  beforeEach(() => {
    resetAuthHealthCache();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("asks /auth/v1/health with the public key only", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}"));
    await expect(checkAuthHealth(fetchImpl, 1_000)).resolves.toBe("up");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://project.example.co/auth/v1/health");
    expect(init.headers).toEqual({ apikey: "anon-key" });
  });

  it("402 exceed_egress_quota is down", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"message":"restricted: exceed_egress_quota"}', {
        status: 402,
      }),
    );
    await expect(checkAuthHealth(fetchImpl, 1_000)).resolves.toBe("down");
  });

  it("no answer is down", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(checkAuthHealth(fetchImpl, 1_000)).resolves.toBe("down");
  });

  it("caches the answer for 30 s so a busy health check adds no load", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}"));
    await checkAuthHealth(fetchImpl, 1_000);
    await checkAuthHealth(fetchImpl, 20_000);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await checkAuthHealth(fetchImpl, 31_001);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
});
