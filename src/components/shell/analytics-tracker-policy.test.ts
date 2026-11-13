import { describe, expect, it } from "vitest";
import { analyticsBeaconEnabled } from "./analytics-tracker-policy";

describe("analytics beacon policy", () => {
  it("keeps tracking enabled by default", () => {
    expect(analyticsBeaconEnabled(undefined)).toBe(true);
    expect(analyticsBeaconEnabled("false")).toBe(true);
  });

  it("disables tracking only for an explicit true value", () => {
    expect(analyticsBeaconEnabled("true")).toBe(false);
    expect(analyticsBeaconEnabled("True")).toBe(true);
  });
});
