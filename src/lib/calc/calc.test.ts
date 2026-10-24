import { describe, expect, it } from "vitest";
import {
  clampStep,
  freelanceOrder,
  hiringCost,
  ugcBudget,
  usdText,
} from "./index";

const PRICES = {
  hireCents: 7900,
  teamMonthCents: 19900,
  teamYearCents: 199000,
};

describe("Spoki calculators (D523)", () => {
  it("keeps a slider value inside its bounds and on its step", () => {
    expect(clampStep(7, 1, 30, 1)).toBe(7);
    expect(clampStep(0, 1, 30, 1)).toBe(1);
    expect(clampStep(99, 1, 30, 1)).toBe(30);
    expect(clampStep(1234, 500, 50_000, 500)).toBe(1000);
    expect(clampStep(Number.NaN, 500, 50_000, 500)).toBe(500);
    expect(clampStep(49_999, 500, 50_000, 500)).toBe(50_000);
  });

  it("counts a UGC budget as videos times reward, no fee", () => {
    expect(ugcBudget({ videos: 5, rewardCents: 5000 })).toEqual({
      totalCents: 25_000,
    });
    expect(ugcBudget({ videos: 30, rewardCents: 50_000 }).totalCents).toBe(
      1_500_000,
    );
  });

  it("counts a freelance order as package price times quantity, no fee", () => {
    expect(freelanceOrder({ priceCents: 12_000, quantity: 3 })).toEqual({
      totalCents: 36_000,
    });
  });

  it("compares Hire per job with Team per month", () => {
    const two = hiringCost({ jobsPerMonth: 2, billing: "month" }, PRICES);
    expect(two).toMatchObject({
      hireCents: 15_800,
      teamCents: 19_900,
      cheaper: "hire",
      savingCents: 4_100,
      breakEvenJobs: 3,
    });
    const three = hiringCost({ jobsPerMonth: 3, billing: "month" }, PRICES);
    expect(three).toMatchObject({ hireCents: 23_700, cheaper: "team" });
  });

  it("counts yearly Team per month and moves the break-even point", () => {
    const yearly = hiringCost({ jobsPerMonth: 2, billing: "year" }, PRICES);
    // $1990 / 12 = $165.83
    expect(yearly.teamCents).toBe(16_583);
    expect(yearly.cheaper).toBe("hire");
    expect(yearly.breakEvenJobs).toBe(3);
    expect(
      hiringCost({ jobsPerMonth: 1, billing: "year" }, PRICES).cheaper,
    ).toBe("hire");
  });

  it("treats equal costs as Hire", () => {
    const even = hiringCost(
      { jobsPerMonth: 2, billing: "month" },
      { hireCents: 100, teamMonthCents: 200, teamYearCents: 2400 },
    );
    expect(even).toMatchObject({ cheaper: "hire", savingCents: 0 });
  });

  it("writes dollars without cents when whole", () => {
    expect(usdText(25_000, "en")).toBe("$250");
    expect(usdText(16_583, "en")).toBe("$165.83");
  });
});
