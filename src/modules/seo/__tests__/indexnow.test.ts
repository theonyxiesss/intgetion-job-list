import { afterEach, describe, expect, it, vi } from "vitest";
import {
  indexNowKey,
  INDEXNOW_KEY_PATH,
  localeUrls,
  submitToIndexNow,
} from "../indexnow";

const SITE = "https://intgetion.com";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("IndexNow (D284)", () => {
  it("takes a plausible key and refuses anything else", () => {
    expect(indexNowKey({ INDEXNOW_KEY: "abc12345" })).toBe("abc12345");
    expect(indexNowKey({ INDEXNOW_KEY: "  abc12345  " })).toBe("abc12345");
    expect(indexNowKey({})).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: "" })).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: "short" })).toBeNull();
    expect(indexNowKey({ INDEXNOW_KEY: "has space here" })).toBeNull();
  });

  it("sends both language versions of a path", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    expect(localeUrls("/jobs/42")).toEqual([
      `${SITE}/jobs/42`,
      `${SITE}/ru/jobs/42`,
    ]);
  });

  it("stays quiet without a key, without paths, and on localhost", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    const fetcher = vi.fn();
    expect(await submitToIndexNow(["/jobs/1"], fetcher as never)).toBe(
      "skipped",
    );
    vi.stubEnv("INDEXNOW_KEY", "indexnow-test-value");
    expect(await submitToIndexNow([], fetcher as never)).toBe("skipped");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    expect(await submitToIndexNow(["/jobs/1"], fetcher as never)).toBe(
      "skipped",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts the host, the key and where the key file lives", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    vi.stubEnv("INDEXNOW_KEY", "indexnow-test-value");
    let sentBody = "{}";
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      sentBody = String(init?.body ?? "{}");
      return new Response(null, { status: 200 });
    });
    expect(await submitToIndexNow(["/jobs/7"], fetcher as never)).toBe("sent");
    const body = JSON.parse(sentBody) as Record<string, unknown>;
    expect(body).toMatchObject({
      host: "intgetion.com",
      key: "indexnow-test-value",
      keyLocation: `${SITE}${INDEXNOW_KEY_PATH}`,
      urlList: [`${SITE}/jobs/7`, `${SITE}/ru/jobs/7`],
    });
  });

  it("swallows a refusal and a network failure", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", SITE);
    vi.stubEnv("INDEXNOW_KEY", "indexnow-test-value");
    const refused = vi.fn(async () => new Response(null, { status: 403 }));
    expect(await submitToIndexNow(["/jobs/7"], refused as never)).toBe(
      "failed",
    );
    const broken = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await submitToIndexNow(["/jobs/7"], broken as never)).toBe("failed");
  });
});
