import { describe, expect, it } from "vitest";
import { clientStatus, settlement } from "./status";

const now = new Date("2026-10-08T12:00:00Z");
const later = new Date("2026-10-08T12:30:00Z");

describe("clientStatus", () => {
  it("shows Start until the server has confirmed the transfer", () => {
    expect(
      clientStatus({
        status: "open",
        reason: null,
        expiresAt: later,
        now,
      }),
    ).toBe("awaiting_payment");
    expect(
      clientStatus({
        status: "submitted",
        reason: null,
        expiresAt: later,
        now,
      }),
    ).toBe("checking");
    expect(
      clientStatus({
        status: "confirmed",
        reason: null,
        expiresAt: later,
        now,
      }),
    ).toBe("paid");
  });

  it("does not treat an underpaid or expired order as paid", () => {
    expect(
      clientStatus({
        status: "submitted",
        reason: "underpaid",
        expiresAt: later,
        now,
      }),
    ).toBe("underpaid");
    expect(
      clientStatus({
        status: "open",
        reason: null,
        expiresAt: now,
        now,
      }),
    ).toBe("expired");
  });
});

describe("settlement", () => {
  it("grants Hire only when the transfer checks out", () => {
    expect(settlement({ ok: true, value: BigInt(1) })).toEqual({
      status: "confirmed",
      reason: null,
      grant: true,
    });
    expect(settlement({ ok: false, reason: "underpaid" }).grant).toBe(false);
    expect(settlement({ ok: false, reason: "no_transfer" }).grant).toBe(false);
    expect(settlement({ ok: false, reason: "sanctioned" })).toMatchObject({
      status: "frozen",
      grant: false,
    });
    expect(settlement({ ok: false, reason: "confirmations" })).toMatchObject({
      status: "submitted",
      grant: false,
    });
  });
});
