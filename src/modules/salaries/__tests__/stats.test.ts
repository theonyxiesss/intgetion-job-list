import { describe, expect, it } from "vitest";
import type { FxRate } from "@/lib/money";
import {
  buildSkillStats,
  MIN_JOBS_PER_SKILL,
  percentile,
  yearlyUsd,
  type SalarySample,
} from "../service/stats";

const NOW = new Date("2026-10-05T12:00:00Z");

function sample(over: Partial<SalarySample> = {}): SalarySample {
  return {
    jobId: crypto.randomUUID(),
    skillSlugs: ["solidity"],
    seniority: "mid",
    salaryMin: BigInt(500000), // 5 000 USD / month
    salaryMax: BigInt(700000), // 7 000 USD / month
    currency: "USD",
    period: "month",
    basis: "gross",
    ...over,
  };
}

describe("yearlyUsd (D4, D5, D260)", () => {
  it("takes the midpoint of the range in dollars per year", () => {
    expect(yearlyUsd(sample(), [], NOW)).toBe(72000);
  });

  it("uses the single bound when only one is set", () => {
    expect(yearlyUsd(sample({ salaryMax: null }), [], NOW)).toBe(60000);
    expect(
      yearlyUsd(
        sample({
          salaryMin: null,
          salaryMax: BigInt(12000000),
          period: "year",
        }),
        [],
        NOW,
      ),
    ).toBe(120000);
  });

  it("skips net, hourly and salary-less jobs", () => {
    expect(yearlyUsd(sample({ basis: "net" }), [], NOW)).toBeNull();
    expect(yearlyUsd(sample({ period: "hour" }), [], NOW)).toBeNull();
    expect(
      yearlyUsd(sample({ salaryMin: null, salaryMax: null }), [], NOW),
    ).toBeNull();
  });

  it("converts through a fresh rate and skips a missing or stale one", () => {
    const eur = sample({ currency: "EUR" });
    const fresh: FxRate = {
      currency: "EUR",
      rateToUsd: "1.10000000",
      asOf: new Date("2026-10-03"),
    };
    expect(yearlyUsd(eur, [fresh], NOW)).toBe(79200);
    expect(yearlyUsd(eur, [], NOW)).toBeNull();
    expect(
      yearlyUsd(eur, [{ ...fresh, asOf: new Date("2026-09-01") }], NOW),
    ).toBeNull();
  });
});

describe("percentile", () => {
  it("interpolates between neighbours", () => {
    expect(percentile([10, 20, 30, 40], 0.5)).toBe(25);
    expect(percentile([10, 20, 30, 40, 50], 0.25)).toBe(20);
    expect(percentile([7], 0.75)).toBe(7);
  });
});

describe("buildSkillStats (D260)", () => {
  it("hides a skill below the job threshold", () => {
    const samples = Array.from({ length: MIN_JOBS_PER_SKILL - 1 }, () =>
      sample(),
    );
    expect(buildSkillStats(samples, [], NOW)).toEqual([]);
  });

  it("counts only comparable jobs toward the threshold", () => {
    const samples = [
      ...Array.from({ length: MIN_JOBS_PER_SKILL - 1 }, () => sample()),
      sample({ basis: "net" }),
    ];
    expect(buildSkillStats(samples, [], NOW)).toEqual([]);
  });

  it("returns quartiles and seniority rows with enough jobs", () => {
    const samples = [
      ...Array.from({ length: 6 }, (_, i) =>
        sample({
          seniority: "senior",
          salaryMin: BigInt(800000 + i * 100000),
          salaryMax: null,
        }),
      ),
      ...Array.from({ length: 4 }, () => sample({ seniority: "entry" })),
    ];
    const [stats] = buildSkillStats(samples, [], NOW);
    expect(stats?.skillSlug).toBe("solidity");
    expect(stats?.jobCount).toBe(10);
    expect(stats?.median).toBe(102000);
    expect(stats?.bySeniority.map((row) => row.seniority)).toEqual(["senior"]);
    expect(stats?.bySeniority[0]?.median).toBe(126000);
  });

  it("does not count a job twice for a repeated skill", () => {
    const samples = Array.from({ length: MIN_JOBS_PER_SKILL - 1 }, () =>
      sample({ skillSlugs: ["rust", "rust"] }),
    );
    expect(buildSkillStats(samples, [], NOW)).toEqual([]);
  });
});
