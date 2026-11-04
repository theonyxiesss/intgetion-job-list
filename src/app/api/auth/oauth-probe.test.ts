import { describe, expect, it, vi } from "vitest";

vi.mock("@/modules/auth/service", () => ({}));
vi.mock("@/lib/supabase/server", () => ({}));
vi.mock("@/lib/rate-limit", () => ({}));

const { isGoogleAuthorizeHost, oauthProbeOutcome } =
  await import("./oauth-redirect");

describe("oauthProbeOutcome (D606)", () => {
  it("a redirect to Google is ok", () => {
    expect(
      oauthProbeOutcome(
        302,
        "https://accounts.google.com/o/oauth2/v2/auth?x=1",
        isGoogleAuthorizeHost,
      ),
    ).toBe("ok");
  });

  it("402 from a restricted project is Auth down, not just Google", () => {
    expect(oauthProbeOutcome(402, null, isGoogleAuthorizeHost)).toBe(
      "auth_unavailable",
    );
    expect(oauthProbeOutcome(503, null, isGoogleAuthorizeHost)).toBe(
      "auth_unavailable",
    );
  });

  it("a provider that is off (400) is only this provider", () => {
    expect(oauthProbeOutcome(400, null, isGoogleAuthorizeHost)).toBe(
      "oauth_unavailable",
    );
    expect(
      oauthProbeOutcome(302, "https://evil.example/", isGoogleAuthorizeHost),
    ).toBe("oauth_unavailable");
  });
});
