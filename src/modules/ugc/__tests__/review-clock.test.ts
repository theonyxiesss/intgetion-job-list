import { describe, expect, it } from "vitest";
import {
  addBusinessDays,
  reviewDueAt,
  reviewStage,
} from "../service/review-clock";

// 2026-10-26 is a Monday.
const monday = new Date("2026-10-26T10:00:00.000Z");
const at = (iso: string) => new Date(iso);

describe("review clock (D574)", () => {
  it("counts business days and skips the weekend", () => {
    expect(addBusinessDays(monday, 3).toISOString()).toBe(
      "2026-10-29T10:00:00.000Z",
    );
    expect(addBusinessDays(monday, 5).toISOString()).toBe(
      "2026-11-02T10:00:00.000Z",
    );
    const friday = at("2026-10-30T10:00:00.000Z");
    expect(addBusinessDays(friday, 1).toISOString()).toBe(
      "2026-11-02T10:00:00.000Z",
    );
  });

  it("is due five business days after the video was sent", () => {
    expect(reviewDueAt(monday).toISOString()).toBe("2026-11-02T10:00:00.000Z");
    // Sent on a Saturday: the clock starts on the next business day.
    expect(reviewDueAt(at("2026-10-31T10:00:00.000Z")).toISOString()).toBe(
      "2026-11-06T10:00:00.000Z",
    );
  });

  it("moves through reminder, last day and overdue", () => {
    expect(reviewStage(at("2026-10-28T23:59:00.000Z"), monday)).toBe(0);
    expect(reviewStage(at("2026-10-29T10:00:00.000Z"), monday)).toBe(1);
    expect(reviewStage(at("2026-10-30T09:59:00.000Z"), monday)).toBe(1);
    expect(reviewStage(at("2026-10-30T10:00:00.000Z"), monday)).toBe(2);
    expect(reviewStage(at("2026-11-02T09:59:00.000Z"), monday)).toBe(2);
    expect(reviewStage(at("2026-11-02T10:00:00.000Z"), monday)).toBe(3);
    expect(reviewStage(at("2026-12-01T10:00:00.000Z"), monday)).toBe(3);
  });

  it("is on stage 0 right after sending", () => {
    expect(reviewStage(monday, monday)).toBe(0);
  });
});
