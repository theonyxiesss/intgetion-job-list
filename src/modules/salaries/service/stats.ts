import {
  divRoundHalfEven,
  toUsdMonthlyMinor,
  type FxRate,
  type SalaryBasis,
  type SalaryPeriod,
} from "@/lib/money";

/** A skill page shows numbers only from this many comparable jobs (D260). */
export const MIN_JOBS_PER_SKILL = 10;
/** A seniority row needs at least this many of those jobs (D260). */
export const MIN_JOBS_PER_ROW = 5;
/** Jobs published within this window count (D260). */
export const WINDOW_DAYS = 180;

export const SENIORITY_ORDER = [
  "internship",
  "entry",
  "mid",
  "senior",
  "lead",
] as const;
export type Seniority = (typeof SENIORITY_ORDER)[number];

/** One own job with a salary, as read from the database. */
export interface SalarySample {
  jobId: string;
  skillSlugs: string[];
  seniority: Seniority | null;
  salaryMin: bigint | null;
  salaryMax: bigint | null;
  currency: string | null;
  period: SalaryPeriod | null;
  basis: SalaryBasis | null;
}

/** USD whole dollars per year: the unit every salary page shows. */
export interface SalaryRange {
  jobCount: number;
  p25: number;
  median: number;
  p75: number;
}

export interface SkillSalaryStats extends SalaryRange {
  skillSlug: string;
  bySeniority: (SalaryRange & { seniority: Seniority })[];
}

/**
 * Midpoint of the range in USD per year, or null when the job cannot be
 * compared: net pay, hourly pay, or no fresh rate (D4, D5, D260).
 */
export function yearlyUsd(
  sample: SalarySample,
  fxRates: readonly FxRate[],
  now: Date,
): number | null {
  if (sample.basis !== "gross" || !sample.period || !sample.currency) {
    return null;
  }
  const low = sample.salaryMin ?? sample.salaryMax;
  const high = sample.salaryMax ?? sample.salaryMin;
  if (low === null || high === null) return null;
  const mid = divRoundHalfEven(low + high, BigInt(2));
  const monthly = toUsdMonthlyMinor(
    {
      amountMinor: mid,
      currency: sample.currency,
      period: sample.period,
      basis: sample.basis,
    },
    fxRates,
    now,
  );
  if (monthly === null) return null;
  // Cents per month → whole dollars per year.
  return Number(divRoundHalfEven(monthly * BigInt(12), BigInt(100)));
}

/** Linear-interpolated percentile of sorted values (q in 0..1). */
export function percentile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) throw new Error("percentile of an empty list");
  const position = (sorted.length - 1) * q;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const value =
    sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (position - lower);
  return Math.round(value);
}

function range(values: number[]): SalaryRange {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    jobCount: sorted.length,
    p25: percentile(sorted, 0.25),
    median: percentile(sorted, 0.5),
    p75: percentile(sorted, 0.75),
  };
}

/** Per-skill ranges for skills with enough comparable jobs, most jobs first. */
export function buildSkillStats(
  samples: readonly SalarySample[],
  fxRates: readonly FxRate[],
  now: Date,
): SkillSalaryStats[] {
  const bySkill = new Map<
    string,
    { value: number; seniority: Seniority | null }[]
  >();
  for (const sample of samples) {
    const value = yearlyUsd(sample, fxRates, now);
    if (value === null) continue;
    for (const slug of new Set(sample.skillSlugs)) {
      const list = bySkill.get(slug) ?? [];
      list.push({ value, seniority: sample.seniority });
      bySkill.set(slug, list);
    }
  }

  const result: SkillSalaryStats[] = [];
  for (const [skillSlug, entries] of bySkill) {
    if (entries.length < MIN_JOBS_PER_SKILL) continue;
    const bySeniority = SENIORITY_ORDER.flatMap((seniority) => {
      const values = entries
        .filter((entry) => entry.seniority === seniority)
        .map((entry) => entry.value);
      return values.length >= MIN_JOBS_PER_ROW
        ? [{ seniority, ...range(values) }]
        : [];
    });
    result.push({
      skillSlug,
      ...range(entries.map((entry) => entry.value)),
      bySeniority,
    });
  }
  return result.sort(
    (a, b) => b.jobCount - a.jobCount || a.skillSlug.localeCompare(b.skillSlug),
  );
}
