import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestError, parseDsn } from "./instrumentation";

const request = {
  path: "/en/jobs?email=test@example.com",
  method: "GET",
  headers: { "x-request-id": "req-1", cookie: "sb-token=secret" },
};
const context = {
  routerKind: "App Router" as const,
  routePath: "/[locale]/jobs",
  routeType: "render" as const,
  renderSource: "react-server-components" as const,
  revalidateReason: undefined,
};

describe("Sentry reporting (D197)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SENTRY_DSN", "");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("parses the DSN into the envelope endpoint and key", () => {
    expect(parseDsn("https://abc@o1.ingest.sentry.io/42")).toEqual({
      endpoint: "https://o1.ingest.sentry.io/api/42/envelope/",
      publicKey: "abc",
    });
    expect(parseDsn("not a dsn")).toBeNull();
    expect(parseDsn("https://o1.ingest.sentry.io/42")).toBeNull();
  });

  it("sends nothing without a DSN", async () => {
    await onRequestError(new Error("boom"), request, context);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the message and the path without query, headers or cookies", async () => {
    vi.stubEnv("SENTRY_DSN", "https://abc@o1.ingest.sentry.io/42");
    await onRequestError(new Error("boom"), request, context);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://o1.ingest.sentry.io/api/42/envelope/");
    expect(init.headers["x-sentry-auth"]).toContain("sentry_key=abc");
    const [, item, payload] = String(init.body).split("\n");
    expect(JSON.parse(item!)).toEqual({ type: "event" });
    const event = JSON.parse(payload!);
    expect(event.message).toBe("boom");
    expect(event.tags).toMatchObject({
      method: "GET",
      path: "/en/jobs",
      request_id: "req-1",
    });
    expect(String(init.body)).not.toContain("test@example.com");
    expect(String(init.body)).not.toContain("secret");
  });

  it("swallows a failed send", async () => {
    vi.stubEnv("SENTRY_DSN", "https://abc@o1.ingest.sentry.io/42");
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(
      onRequestError(new Error("boom"), request, context),
    ).resolves.toBeUndefined();
  });
});
