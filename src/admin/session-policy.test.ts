import { describe, expect, it } from "vitest";
import {
  ADMIN_ABSOLUTE_MS,
  ADMIN_IDLE_MS,
  ADMIN_STEP_UP_MS,
  countryFromHeader,
  deviceClassOf,
  sessionAlive,
  stepUpFresh,
} from "./session-policy";

const start = new Date("2026-10-05T12:00:00.000Z");

describe("admin session schedule", () => {
  it("ends after 30 minutes without activity", () => {
    expect(
      sessionAlive(start, start, new Date(start.getTime() + ADMIN_IDLE_MS)),
    ).toBe(true);
    expect(
      sessionAlive(start, start, new Date(start.getTime() + ADMIN_IDLE_MS + 1)),
    ).toBe(false);
  });

  it("ends 8 hours after creation even when it stays active", () => {
    const recent = new Date(start.getTime() + ADMIN_ABSOLUTE_MS - 1000);
    expect(
      sessionAlive(
        start,
        recent,
        new Date(start.getTime() + ADMIN_ABSOLUTE_MS),
      ),
    ).toBe(true);
    expect(
      sessionAlive(
        start,
        new Date(start.getTime() + ADMIN_ABSOLUTE_MS),
        new Date(start.getTime() + ADMIN_ABSOLUTE_MS + 1),
      ),
    ).toBe(false);
  });

  it("asks for the second factor again after 10 minutes", () => {
    expect(
      stepUpFresh(start, new Date(start.getTime() + ADMIN_STEP_UP_MS)),
    ).toBe(true);
    expect(
      stepUpFresh(start, new Date(start.getTime() + ADMIN_STEP_UP_MS + 1)),
    ).toBe(false);
    expect(stepUpFresh(null, start)).toBe(false);
  });

  it("classifies the device and keeps only a two-letter country", () => {
    expect(deviceClassOf("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      "phone",
    );
    expect(deviceClassOf("Mozilla/5.0 (iPad)")).toBe("tablet");
    expect(deviceClassOf("Mozilla/5.0 (Windows NT 10.0)")).toBe("desktop");
    expect(deviceClassOf(null)).toBe("unknown");
    expect(countryFromHeader("de")).toBe("DE");
    expect(countryFromHeader("DEU")).toBeNull();
    expect(countryFromHeader(null)).toBeNull();
  });
});
