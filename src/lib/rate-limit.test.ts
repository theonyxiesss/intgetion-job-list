import { describe, expect, it } from "vitest";
import { botMessageBucket, rateRules } from "./rate-limit";

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
