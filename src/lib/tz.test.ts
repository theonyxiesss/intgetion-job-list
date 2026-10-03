import { describe, expect, it } from "vitest";
import {
  InvalidTimeError,
  InvalidTimeZoneError,
  isValidTimeZone,
  localToUtc,
  timeZoneOffsetMinutes,
  workHoursOverlap,
  type WorkHoursOverlapInput,
} from "./tz";

const MON_2026_01_12 = new Date("2026-01-12T00:00:00Z"); // Monday
const MON_2026_03_09 = new Date("2026-03-09T00:00:00Z"); // US on DST, EU not yet
const MON_2026_07_13 = new Date("2026-07-13T00:00:00Z"); // both on DST
const MON_2026_10_26 = new Date("2026-10-26T00:00:00Z"); // EU off DST, US not yet

function overlapCase(overrides: Partial<WorkHoursOverlapInput>) {
  return workHoursOverlap({
    candidate: {
      timeZone: "Europe/Berlin",
      start: "09:00",
      end: "18:00",
      workDays: [1, 2, 3, 4, 5],
    },
    job: { timeZone: "America/New_York" },
    from: MON_2026_01_12,
    days: 7,
    ...overrides,
  });
}

describe("isValidTimeZone (D6, D65)", () => {
  it("accepts IANA zone names and the UTC pivot", () => {
    for (const zone of [
      "Europe/Berlin",
      "America/New_York",
      "Asia/Kolkata",
      "Australia/Lord_Howe",
      "UTC",
      "Etc/UTC",
    ]) {
      expect(isValidTimeZone(zone)).toBe(true);
    }
  });

  it("rejects fixed offsets, junk and empty strings", () => {
    for (const zone of [
      "",
      "Mars/Olympus",
      "+03:00",
      "+0300",
      "UTC+3",
      "GMT-5",
      "Etc/GMT-3",
    ]) {
      expect(isValidTimeZone(zone)).toBe(false);
    }
  });

  it("assertTimeZone throws InvalidTimeZoneError on bad input", () => {
    expect(() => localToUtc(MON_2026_01_12, "09:00", "UTC+3")).toThrow(
      InvalidTimeZoneError,
    );
    expect(() => localToUtc(MON_2026_01_12, "09:00", "Mars/Olympus")).toThrow(
      InvalidTimeZoneError,
    );
  });
});

describe("timeZoneOffsetMinutes", () => {
  it("resolves the offset per instant", () => {
    expect(
      timeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"), "Europe/Berlin"),
    ).toBe(60);
    expect(
      timeZoneOffsetMinutes(new Date("2026-07-15T12:00:00Z"), "Europe/Berlin"),
    ).toBe(120);
    expect(
      timeZoneOffsetMinutes(
        new Date("2026-01-15T12:00:00Z"),
        "America/New_York",
      ),
    ).toBe(-300);
    expect(
      timeZoneOffsetMinutes(
        new Date("2026-07-15T12:00:00Z"),
        "America/New_York",
      ),
    ).toBe(-240);
    expect(
      timeZoneOffsetMinutes(new Date("2026-01-15T12:00:00Z"), "Asia/Kolkata"),
    ).toBe(330);
  });
});

describe("localToUtc", () => {
  it("converts ordinary wall times in both hemispheres", () => {
    expect(
      localToUtc(new Date("2026-01-15T00:00:00Z"), "09:00", "Europe/Berlin"),
    ).toEqual(new Date("2026-01-15T08:00:00Z"));
    expect(
      localToUtc(new Date("2026-07-15T00:00:00Z"), "09:00", "Europe/Berlin"),
    ).toEqual(new Date("2026-07-15T07:00:00Z"));
    expect(
      localToUtc(new Date("2026-01-15T00:00:00Z"), "09:00", "America/New_York"),
    ).toEqual(new Date("2026-01-15T14:00:00Z"));
    expect(
      localToUtc(new Date("2026-07-15T00:00:00Z"), "09:00", "America/New_York"),
    ).toEqual(new Date("2026-07-15T13:00:00Z"));
    expect(
      localToUtc(new Date("2026-01-15T00:00:00Z"), "09:00", "Asia/Kolkata"),
    ).toEqual(new Date("2026-01-15T03:30:00Z"));
  });

  it("handles half-hour zones like Australia/Lord_Howe", () => {
    // DST +11:00 in southern summer (January)
    expect(
      localToUtc(
        new Date("2026-01-15T00:00:00Z"),
        "09:00",
        "Australia/Lord_Howe",
      ),
    ).toEqual(new Date("2026-01-14T22:00:00Z"));
    // Standard +10:30 in southern winter (July)
    expect(
      localToUtc(
        new Date("2026-07-15T00:00:00Z"),
        "09:00",
        "Australia/Lord_Howe",
      ),
    ).toEqual(new Date("2026-07-14T22:30:00Z"));
    // DST +11:00 (DST started 2026-10-04)
    expect(
      localToUtc(
        new Date("2026-10-10T00:00:00Z"),
        "09:00",
        "Australia/Lord_Howe",
      ),
    ).toEqual(new Date("2026-10-09T22:00:00Z"));
  });

  it("resolves a nonexistent spring-forward wall time forward across the gap (D65)", () => {
    // Berlin 2026-03-29 02:30 does not exist (01:00Z: 02:00 CET → 03:00 CEST).
    // Interpreted with the pre-transition offset: 02:30 CET = 01:30Z = 03:30 CEST.
    expect(
      localToUtc(new Date("2026-03-29T00:00:00Z"), "02:30", "Europe/Berlin"),
    ).toEqual(new Date("2026-03-29T01:30:00Z"));
    // New York 2026-03-08 02:30 does not exist either.
    expect(
      localToUtc(new Date("2026-03-08T00:00:00Z"), "02:30", "America/New_York"),
    ).toEqual(new Date("2026-03-08T07:30:00Z"));
    // Wall times on either side of the gap still convert exactly.
    expect(
      localToUtc(new Date("2026-03-29T00:00:00Z"), "01:30", "Europe/Berlin"),
    ).toEqual(new Date("2026-03-29T00:30:00Z"));
    expect(
      localToUtc(new Date("2026-03-29T00:00:00Z"), "03:30", "Europe/Berlin"),
    ).toEqual(new Date("2026-03-29T01:30:00Z"));
  });

  it("picks the first occurrence of a repeated fall-back wall time (D65)", () => {
    // Berlin 2026-10-25 02:30 happens twice (CEST 00:30Z, CET 01:30Z).
    expect(
      localToUtc(new Date("2026-10-25T00:00:00Z"), "02:30", "Europe/Berlin"),
    ).toEqual(new Date("2026-10-25T00:30:00Z"));
  });

  it("rejects malformed wall times", () => {
    const day = new Date("2026-01-15T00:00:00Z");
    for (const time of [
      "24:00",
      "9:00",
      "0900",
      "ab:cd",
      "",
      "12:60",
      null as unknown as string,
    ]) {
      expect(() => localToUtc(day, time, "Europe/Berlin")).toThrow(
        InvalidTimeError,
      );
    }
  });
});

describe("workHoursOverlap across DST-desync weeks (Berlin ↔ New York)", () => {
  it("gives 4h in March (US already on DST, EU not yet)", () => {
    const result = overlapCase({ from: MON_2026_03_09 });
    expect(result.workingDayCount).toBe(5);
    expect(result.averageOverlapMinutes).toBe(240); // 13:00–17:00 UTC
    expect(result.days[0]).toMatchObject({
      date: "2026-03-09",
      isoWeekday: 1,
      workingDay: true,
      overlapMinutes: 240,
    });
  });

  it("gives 4h in late October (EU already off DST, US not yet)", () => {
    const result = overlapCase({ from: MON_2026_10_26 });
    expect(result.averageOverlapMinutes).toBe(240);
  });

  it("gives 3h in aligned winter and summer weeks", () => {
    expect(overlapCase({ from: MON_2026_01_12 }).averageOverlapMinutes).toBe(
      180,
    );
    expect(overlapCase({ from: MON_2026_07_13 }).averageOverlapMinutes).toBe(
      180,
    );
  });
});

describe("workHoursOverlap other zones and windows", () => {
  it("compares Berlin with Asia/Kolkata (+5:30)", () => {
    const result = overlapCase({
      job: { timeZone: "Asia/Kolkata" },
      from: MON_2026_01_12,
    });
    // Berlin 08:00–17:00Z, Kolkata 03:30–12:30Z → 08:00–12:30 = 4.5h
    expect(result.averageOverlapMinutes).toBe(270);
  });

  it("skips days outside candidate workDays (ISO weekday in candidate zone)", () => {
    const result = overlapCase({
      from: MON_2026_01_12,
      job: { timeZone: "Europe/Berlin" },
      candidate: {
        timeZone: "Europe/Berlin",
        start: "09:00",
        end: "18:00",
        workDays: [1, 3, 5],
      },
    });
    expect(result.workingDayCount).toBe(3);
    expect(result.averageOverlapMinutes).toBe(540);
    expect(result.days[5]).toMatchObject({
      isoWeekday: 6,
      workingDay: false,
      overlapMinutes: 0,
    });
    expect(result.days[6]).toMatchObject({
      isoWeekday: 7,
      workingDay: false,
      overlapMinutes: 0,
    });
  });

  it("supports windows past midnight against the following job day", () => {
    // Candidate works 22:00–06:00 IST; job hires 04:00–12:00 IST.
    // Overlap lives on the next job day: 04:00–06:00 = 2h.
    const result = workHoursOverlap({
      candidate: {
        timeZone: "Asia/Kolkata",
        start: "22:00",
        end: "06:00",
        workDays: [1],
      },
      job: { timeZone: "Asia/Kolkata", start: "04:00", end: "12:00" },
      from: MON_2026_01_12,
      days: 1,
    });
    expect(result.days).toHaveLength(1);
    expect(result.averageOverlapMinutes).toBe(120);
  });

  it("treats end == start as a zero-length window", () => {
    const result = workHoursOverlap({
      candidate: {
        timeZone: "Europe/Berlin",
        start: "09:00",
        end: "09:00",
        workDays: [1],
      },
      job: { timeZone: "Europe/Berlin", start: "00:00", end: "23:59" },
      from: MON_2026_01_12,
      days: 1,
    });
    expect(result.averageOverlapMinutes).toBe(0);
  });

  it("returns zeros when the range contains no working day", () => {
    const result = overlapCase({
      from: MON_2026_01_12,
      days: 2,
      candidate: {
        timeZone: "Europe/Berlin",
        start: "09:00",
        end: "18:00",
        workDays: [],
      },
    });
    expect(result).toEqual({
      averageOverlapMinutes: 0,
      workingDayCount: 0,
      days: [
        {
          date: "2026-01-12",
          isoWeekday: 1,
          workingDay: false,
          overlapMinutes: 0,
        },
        {
          date: "2026-01-13",
          isoWeekday: 2,
          workingDay: false,
          overlapMinutes: 0,
        },
      ],
    });
  });

  it("honors the days parameter and reports UTC calendar dates", () => {
    const result = overlapCase({ days: 1 });
    expect(result.days).toHaveLength(1);
    expect(result.days[0].date).toBe("2026-01-12");
    expect(result.workingDayCount).toBe(1);
  });

  it("defaults to a 14-day range", () => {
    const result = workHoursOverlap({
      candidate: {
        timeZone: "Europe/Berlin",
        start: "09:00",
        end: "18:00",
        workDays: [1, 2, 3, 4, 5],
      },
      job: { timeZone: "Europe/Berlin" },
      from: MON_2026_01_12,
    });
    expect(result.days).toHaveLength(14);
    expect(result.days[13].date).toBe("2026-01-25");
  });

  it("validates input", () => {
    expect(() => overlapCase({ days: -1 })).toThrow(RangeError);
    expect(() => overlapCase({ days: 1.5 })).toThrow(RangeError);
    expect(() =>
      overlapCase({
        candidate: {
          timeZone: "Europe/Berlin",
          start: "24:00",
          end: "18:00",
          workDays: [1, 2, 3, 4, 5],
        },
      }),
    ).toThrow(InvalidTimeError);
    expect(() =>
      overlapCase({ job: { timeZone: "Europe/Berlin", start: "9:00" } }),
    ).toThrow(InvalidTimeError);
    expect(() =>
      overlapCase({
        candidate: {
          timeZone: "Europe/Berlin",
          start: "09:00",
          end: "18:00",
          workDays: [0],
        },
      }),
    ).toThrow(RangeError);
    expect(() =>
      overlapCase({
        candidate: {
          timeZone: "Europe/Berlin",
          start: "09:00",
          end: "18:00",
          workDays: [8],
        },
      }),
    ).toThrow(RangeError);
    expect(() =>
      overlapCase({
        candidate: {
          timeZone: "Europe/Berlin",
          start: "09:00",
          end: "18:00",
          workDays: [1.5],
        },
      }),
    ).toThrow(RangeError);
    expect(() => overlapCase({ job: { timeZone: "Not/AZone" } })).toThrow(
      InvalidTimeZoneError,
    );
    expect(() =>
      overlapCase({
        candidate: {
          timeZone: "UTC+3",
          start: "09:00",
          end: "18:00",
          workDays: [1],
        },
      }),
    ).toThrow(InvalidTimeZoneError);
  });
});
