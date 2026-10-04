// src/instrumentation.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { onRequestError } from "./instrumentation";

describe("onRequestError", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const mockRequest = new Request(
    "https://example.com/path?query=string&email=test@example.com",
    {
      headers: new Headers({ "x-request-id": "test-request-id" }),
    },
  );

  beforeEach(() => {
    fetchMock = vi.fn();
    delete process.env.SENTRY_DSN;
    // @ts-expect-error: next-line
    global.fetch = fetchMock;
  });

  afterEach(() => {
    // @ts-expect-error: next-line
    delete global.fetch;
  });

  it("does not call fetch when SENTRY_DSN is not set", async () => {
    await onRequestError(new Error("Test error"), mockRequest);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls fetch when SENTRY_DSN is set", async () => {
    process.env.SENTRY_DSN = "https://public@example.com/12345";
    await onRequestError(new Error("Test error"), mockRequest);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("sends envelope with correct structure (no PII)", async () => {
    process.env.SENTRY_DSN = "https://public@example.com/12345";
    const error = new Error("Test error message");
    await onRequestError(error, mockRequest);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/12345/envelope/"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-sentry-envelope" },
        body: expect.any(String),
      }),
    );

    // Get the body of the fetch call
    const body = (fetchMock.mock.calls[0][1] as { body: string }).body;
    expect(typeof body).toBe("string");

    // Check that the envelope contains the expected parts
    expect(body).toContain('"message":"Test error message"');
    expect(body).toContain('"url":"https://example.com/path"');
    expect(body).toContain('"x-request-id":"test-request-id"');

    // Ensure no query or email in the envelope
    expect(body).not.toContain("query=string");
    expect(body).not.toContain("email=test@example.com");
  });
});
