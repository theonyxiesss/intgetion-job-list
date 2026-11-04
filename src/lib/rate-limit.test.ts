import { describe, expect, it } from "vitest";
import { botMessageBucket, guestBotBuckets, rateRules } from "./rate-limit";

describe("guest Spoki cap (D607)", () => {
  it("counts each guest message per session and per IP alone", () => {
    expect(guestBotBuckets("203.0.113.7", "abc")).toEqual([
      ["botGuest", "203.0.113.7:abc"],
      ["botGuestIp", "203.0.113.7"],
    ]);
    expect(rateRules.botGuestIp.limit).toBe(20);
    expect(rateRules.botGuestIp.windowSeconds).toBe(24 * 60 * 60);
  });

  it("gives a new cookie on the same IP the same IP key", () => {
    const first = guestBotBuckets("203.0.113.7", "cookie-1")[1];
    const second = guestBotBuckets("203.0.113.7", "cookie-2")[1];
    expect(first).toEqual(second);
  });
});

describe("Spoki message cap", () => {
  it("keeps the free cap and raises Plus and Pro", () => {
    expect(botMessageBucket("free")).toBe("botUser");
    expect(botMessageBucket("plus")).toBe("botPlus");
    expect(botMessageBucket("pro")).toBe("botPro");
    expect(rateRules.botUser.limit).toBe(15);
    expect(rateRules.botPlus.limit).toBe(100);
    expect(rateRules.botPro.limit).toBe(300);
    expect(rateRules.botGuest.limit).toBe(5);
  });
});
