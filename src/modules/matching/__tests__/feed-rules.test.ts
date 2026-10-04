import { describe, expect, it } from "vitest";
import {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  clampLimit,
  decodeCursor,
  encodeCursor,
  isMatchTab,
  isNewJob,
  pageOf,
  profileHints,
  sortByScore,
  visibleMatches,
} from "../service/feed-rules";

const none = { jobIds: new Set<string>(), companyIds: new Set<string>() };

describe("visibleMatches", () => {
  const rows = [
    { jobId: "a", companyId: "c1", score: 0.9 },
    { jobId: "b", companyId: "c1", score: 0.55 },
    { jobId: "c", companyId: "c2", score: 0.5499 },
    { jobId: "d", companyId: "c3", score: 0.7 },
  ];

  it("keeps only score ≥ 0.55", () => {
    expect(visibleMatches(rows, none).map((row) => row.jobId)).toEqual([
      "a",
      "b",
      "d",
    ]);
  });

  it("drops a job dismissed and every job of a company hidden since caching", () => {
    const excluded = {
      jobIds: new Set(["d"]),
      companyIds: new Set(["c1"]),
    };
    expect(visibleMatches(rows, excluded)).toEqual([]);
  });

  it("orders by score, then job id", () => {
    expect(
      sortByScore([
        { jobId: "b", score: 0.6 },
        { jobId: "a", score: 0.6 },
        { jobId: "c", score: 0.9 },
      ]).map((row) => row.jobId),
    ).toEqual(["c", "a", "b"]);
  });
});

describe("cursor pages", () => {
  const items = Array.from({ length: 45 }, (_, index) => index);

  it("walks the list in pages and ends with a null cursor", () => {
    const first = pageOf(items, 0, 20);
    expect(first.items).toEqual(items.slice(0, 20));
    const secondOffset = decodeCursor(first.nextCursor);
    expect(secondOffset).toBe(20);
    const third = pageOf(items, 40, 20);
    expect(third.items).toEqual([40, 41, 42, 43, 44]);
    expect(third.nextCursor).toBeNull();
  });

  it("round-trips and rejects a forged cursor", () => {
    expect(decodeCursor(encodeCursor(140))).toBe(140);
    expect(decodeCursor(undefined)).toBe(0);
    expect(decodeCursor("not-a-cursor")).toBeNull();
    expect(
      decodeCursor(Buffer.from("o:-1", "utf8").toString("base64url")),
    ).toBeNull();
  });

  it("clamps the limit to 1..50 with 20 by default", () => {
    expect(clampLimit(undefined)).toBe(FEED_DEFAULT_LIMIT);
    expect(clampLimit(500)).toBe(FEED_MAX_LIMIT);
    expect(clampLimit(0)).toBe(1);
  });
});

describe("profile hints (10.5)", () => {
  it("suggests every field hidden for its reason at least three times", () => {
    expect(profileHints({ salary: 3, format: 2, timezone: 5 })).toEqual([
      "salary",
      "timezone",
    ]);
    expect(profileHints({ salary: 2, format: 0, timezone: 0 })).toEqual([]);
  });
});

describe("tabs", () => {
  it("knows its tabs", () => {
    expect(isMatchTab("hidden")).toBe(true);
    expect(isMatchTab("archive")).toBe(false);
  });

  it("calls a job new for 48 hours after publishing", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(isNewJob("2026-10-02T12:00:01Z", now)).toBe(true);
    expect(isNewJob("2026-10-02T12:00:00Z", now)).toBe(false);
    expect(isNewJob(null, now)).toBe(false);
  });
});
