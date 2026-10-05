import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./signed-token";

const now = new Date("2026-10-05T10:00:00Z");
const later = new Date("2026-10-06T10:00:00Z");

describe("signed tokens for email links (D231)", () => {
  const token = signToken("email-add", { userId: "u1" }, later, "secret");

  it("round-trips the claims before expiry", () => {
    expect(
      verifyToken<{ userId: string }>("email-add", token, "secret", now)
        ?.userId,
    ).toBe("u1");
  });

  it("refuses another purpose, another secret, a change or expiry", () => {
    expect(verifyToken("unsubscribe", token, "secret", now)).toBeNull();
    expect(verifyToken("email-add", token, "other", now)).toBeNull();
    expect(verifyToken("email-add", `${token}x`, "secret", now)).toBeNull();
    expect(verifyToken("email-add", token, "secret", later)).toBeNull();
    expect(verifyToken("email-add", "garbage", "secret", now)).toBeNull();
    expect(verifyToken("email-add", token, "", now)).toBeNull();
  });
});
