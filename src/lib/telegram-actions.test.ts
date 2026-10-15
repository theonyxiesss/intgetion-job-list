import { describe, expect, it } from "vitest";
import {
  isTelegramOrderAction,
  readTelegramAction,
  signTelegramAction,
  telegramActionSecret,
} from "./telegram-actions";

const secret = telegramActionSecret("123:test-token");
const orderId = "11111111-2222-4333-8444-555555555555";

describe("signed Telegram buttons for freelance requests (D456)", () => {
  it("fits Telegram's 64-byte callback_data and reads back", () => {
    for (const step of [1, 2] as const) {
      for (const action of ["accept", "decline"] as const) {
        const data = signTelegramAction(secret, step, action, orderId);
        expect(Buffer.byteLength(data)).toBeLessThanOrEqual(64);
        expect(isTelegramOrderAction(data)).toBe(true);
        expect(readTelegramAction(secret, data)).toEqual({
          step,
          action,
          orderId,
        });
      }
    }
  });

  it("refuses a changed order, step, action, expiry or signature", () => {
    const data = signTelegramAction(secret, 1, "accept", orderId);
    const other = "99999999-2222-4333-8444-555555555555";
    expect(readTelegramAction(secret, data.replace(orderId, other))).toBeNull();
    expect(readTelegramAction(secret, data.replace("fr1a", "fr2a"))).toBeNull();
    expect(readTelegramAction(secret, data.replace("fr1a", "fr1d"))).toBeNull();
    const last = data.at(-1) === "x" ? "y" : "x";
    expect(
      readTelegramAction(secret, `${data.slice(0, -1)}${last}`),
    ).toBeNull();
    expect(readTelegramAction(secret, `${data}.extra`)).toBeNull();
    const [head, id, expiry, sig] = data.split(".");
    const later = (parseInt(expiry ?? "0", 36) + 600).toString(36);
    expect(
      readTelegramAction(secret, [head, id, later, sig].join(".")),
    ).toBeNull();
  });

  it("expires: 72 hours for the first tap, one hour for the second", () => {
    const now = new Date("2026-10-15T12:00:00.000Z");
    const first = signTelegramAction(secret, 1, "accept", orderId, now);
    const second = signTelegramAction(secret, 2, "accept", orderId, now);
    const in71h = new Date(now.getTime() + 71 * 3600_000);
    const in73h = new Date(now.getTime() + 73 * 3600_000);
    const in2h = new Date(now.getTime() + 2 * 3600_000);
    expect(readTelegramAction(secret, first, in71h)).not.toBeNull();
    expect(readTelegramAction(secret, first, in73h)).toBeNull();
    expect(readTelegramAction(secret, second, now)).not.toBeNull();
    expect(readTelegramAction(secret, second, in2h)).toBeNull();
  });

  it("refuses data signed with another bot token or no secret", () => {
    const data = signTelegramAction(secret, 2, "decline", orderId);
    expect(
      readTelegramAction(telegramActionSecret("456:other"), data),
    ).toBeNull();
    expect(readTelegramAction("", data)).toBeNull();
  });

  it("leaves sign-in codes and junk to other handlers", () => {
    expect(isTelegramOrderAction("login_abcdef")).toBe(false);
    expect(isTelegramOrderAction(undefined)).toBe(false);
    expect(
      readTelegramAction(secret, "fr1a.not-a-uuid.hmxyz.abcdefabcdefab"),
    ).toBeNull();
  });
});
