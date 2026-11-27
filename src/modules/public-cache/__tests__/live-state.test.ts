import { describe, expect, it } from "vitest";
import { isLive } from "../live-state";

describe("isLive", () => {
  const now = new Date("2026-11-27T12:00:00Z");

  it("treats published jobs without expiry as live", () => {
    expect(isLive({ status: "published", expiresAt: null }, now)).toBe(true);
  });

  it("treats published jobs with a future expiry as live", () => {
    expect(
      isLive(
        { status: "published", expiresAt: new Date("2026-11-27T12:00:01Z") },
        now,
      ),
    ).toBe(true);
  });

  it("treats published jobs past their expiry as not live", () => {
    expect(
      isLive(
        { status: "published", expiresAt: new Date("2026-11-27T11:59:59Z") },
        now,
      ),
    ).toBe(false);
  });

  it("treats non-published jobs as not live", () => {
    expect(isLive({ status: "closed", expiresAt: null }, now)).toBe(false);
  });

  it("treats missing jobs as not live", () => {
    expect(isLive(undefined, now)).toBe(false);
  });
});
