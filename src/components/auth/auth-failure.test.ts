import { describe, expect, it } from "vitest";
import { authFailureOf, errorCodeOf } from "./auth-failure";

function answer(status: number, body: unknown, requestId?: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: requestId ? { "x-request-id": requestId } : {},
  });
}

describe("authFailureOf: Auth down / wrong password / network (D606)", () => {
  it("no response at all is a network failure", async () => {
    await expect(authFailureOf(null)).resolves.toEqual({ code: "network" });
  });

  it("AUTH_UNAVAILABLE is down for everyone, with the support id", async () => {
    const response = answer(
      503,
      {
        error: {
          code: "AUTH_UNAVAILABLE",
          message: "Sign-in is temporarily unavailable",
          details: { reason: "auth_unavailable" },
        },
      },
      "req-12345678",
    );
    await expect(authFailureOf(response)).resolves.toEqual({
      code: "auth_unavailable",
      requestId: "req-12345678",
    });
  });

  it("a wrong password stays a wrong password, without a support id", async () => {
    const response = answer(
      401,
      {
        error: {
          code: "UNAUTHENTICATED",
          message: "Sign-in failed",
          details: { reason: "invalid_credentials" },
        },
      },
      "req-12345678",
    );
    await expect(authFailureOf(response)).resolves.toEqual({
      code: "invalid_credentials",
    });
  });

  it("an unknown 5xx is generic but keeps the id", async () => {
    const response = answer(
      500,
      { error: { code: "INTERNAL", message: "Internal error" } },
      "req-87654321",
    );
    await expect(authFailureOf(response)).resolves.toEqual({
      code: "generic",
      requestId: "req-87654321",
    });
  });

  it("a body that is not JSON is generic", async () => {
    const response = new Response("<html>", { status: 502 });
    await expect(authFailureOf(response)).resolves.toEqual({ code: "generic" });
  });
});

describe("errorCodeOf", () => {
  it("keeps the existing codes", () => {
    expect(errorCodeOf({ error: { code: "RATE_LIMITED" } })).toBe(
      "rate_limited",
    );
    expect(
      errorCodeOf({
        error: {
          code: "VALIDATION_ERROR",
          details: [{ message: "invalid_email" }],
        },
      }),
    ).toBe("invalid_email");
    expect(errorCodeOf({ error: { code: "UNAUTHENTICATED" } })).toBe(
      "invalid_credentials",
    );
    expect(errorCodeOf(null)).toBe("generic");
  });
});
