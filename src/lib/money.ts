/**
 * Money and salary helpers (spec 10.4, decisions D4, D5, D19, D66).
 *
 * Amounts are BigInt minor units end to end. number and float are forbidden
 * for money (D19); the only place a number appears is the final salary score,
 * which is a dimensionless 0..1 value, computed from one BigInt ratio.
 */

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidMoneyError";
  }
}

export type SalaryPeriod = "hour" | "month" | "year";
export type SalaryBasis = "gross" | "net";

export const SALARY_PERIODS: readonly SalaryPeriod[] = [
  "hour",
  "month",
  "year",
];
export const SALARY_BASES: readonly SalaryBasis[] = ["gross", "net"];

/** Money in API DTOs (spec 6): bigint serializes as a digit-only string. */
export interface MoneyDto {
  readonly amountMinor: string;
  readonly currency: string;
  readonly period: SalaryPeriod;
  readonly basis: SalaryBasis;
}

export interface ParsedMoney {
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly period: SalaryPeriod;
  readonly basis: SalaryBasis;
}

/** A salary value ready for comparison; equals ParsedMoney. */
export type SalaryAmount = ParsedMoney;

const AMOUNT_MINOR_RE = /^\d+$/;
const CURRENCY_RE = /^[A-Z]{3}$/;
export const CURRENCY_PATTERN = "^[A-Z]{3}$";

export function isValidAmountMinor(value: unknown): value is string {
  return typeof value === "string" && AMOUNT_MINOR_RE.test(value);
}

export function assertAmountMinor(value: string): string {
  if (!isValidAmountMinor(value)) {
    throw new InvalidMoneyError(
      `amountMinor must be a digit-only string, got: ${String(value)}`,
    );
  }
  return value;
}

export function assertCurrency(value: string): string {
  if (typeof value !== "string" || !CURRENCY_RE.test(value)) {
    throw new InvalidMoneyError(
      `currency must be a 3-letter ISO 4217 code, got: ${String(value)}`,
    );
  }
  return value;
}

export function assertPeriod(value: string): SalaryPeriod {
  if (!SALARY_PERIODS.includes(value as SalaryPeriod)) {
    throw new InvalidMoneyError(
      `period must be one of ${SALARY_PERIODS.join("|")}, got: ${String(value)}`,
    );
  }
  return value as SalaryPeriod;
}

export function assertBasis(value: string): SalaryBasis {
  if (!SALARY_BASES.includes(value as SalaryBasis)) {
    throw new InvalidMoneyError(
      `basis must be one of ${SALARY_BASES.join("|")}, got: ${String(value)}`,
    );
  }
  return value as SalaryBasis;
}

/** Serializes a BigInt amount into the DTO shape of spec 6. */
export function toMoneyDto(
  amountMinor: bigint,
  currency: string,
  period: SalaryPeriod,
  basis: SalaryBasis,
): MoneyDto {
  if (typeof amountMinor !== "bigint" || amountMinor < BigInt(0)) {
    throw new InvalidMoneyError(
      "amountMinor must be a non-negative BigInt in minor units",
    );
  }
  assertCurrency(currency);
  assertPeriod(period);
  assertBasis(basis);
  return { amountMinor: amountMinor.toString(), currency, period, basis };
}

/**
 * Parses a money DTO back into BigInt. Garbage input throws — a silent zero
 * would corrupt salary comparisons (D66).
 */
export function parseMoneyDto(value: unknown): ParsedMoney {
  if (typeof value !== "object" || value === null) {
    throw new InvalidMoneyError("money DTO must be an object");
  }
  const dto = value as Record<string, unknown>;
  if (!isValidAmountMinor(dto.amountMinor)) {
    throw new InvalidMoneyError(
      `amountMinor must be a digit-only string, got: ${String(dto.amountMinor)}`,
    );
  }
  if (typeof dto.currency !== "string") {
    throw new InvalidMoneyError("currency must be a string");
  }
  if (typeof dto.period !== "string") {
    throw new InvalidMoneyError("period must be a string");
  }
  if (typeof dto.basis !== "string") {
    throw new InvalidMoneyError("basis must be a string");
  }
  return {
    amountMinor: BigInt(dto.amountMinor),
    currency: assertCurrency(dto.currency),
    period: assertPeriod(dto.period),
    basis: assertBasis(dto.basis),
  };
}

/**
 * Rounds num/den to the nearest integer with banker's rounding (halves go to
 * the even quotient). Used for every money division (10.4.1).
 */
export function divRoundHalfEven(num: bigint, den: bigint): bigint {
  if (den <= BigInt(0)) {
    throw new InvalidMoneyError("divisor must be positive");
  }
  if (num < BigInt(0)) {
    throw new InvalidMoneyError("money dividend must be non-negative");
  }
  const quotient = num / den;
  const remainderTwice = (num % den) * BigInt(2);
  if (
    remainderTwice > den ||
    (remainderTwice === den && quotient % BigInt(2) === BigInt(1))
  ) {
    return quotient + BigInt(1);
  }
  return quotient;
}

/**
 * Period normalization (10.4.1, D5): year → month with banker's rounding;
 * month stays; hour converts to nothing (null).
 */
export function toMonthlyMinor(
  amountMinor: bigint,
  period: SalaryPeriod,
): bigint | null {
  switch (period) {
    case "year":
      return divRoundHalfEven(amountMinor, BigInt(12));
    case "month":
      return amountMinor;
    case "hour":
      return null;
  }
}

/** J = job.salary_max ?? job.salary_min (10.4.4). */
export function jobSalaryReference(
  salaryMin: bigint | null,
  salaryMax: bigint | null,
): bigint | null {
  return salaryMax ?? salaryMin;
}

export interface FxRate {
  /** ISO 4217 code the rate belongs to. */
  currency: string;
  /** fx_rates.rate_to_usd, numeric(18,8) as a string: units of `currency`
   * per 1 USD (D66). String, not number — floats are forbidden for money. */
  rateToUsd: string;
  asOf: Date;
}

const RATE_SCALE_DIGITS = 8;
const RATE_SCALE = BigInt(10) ** BigInt(RATE_SCALE_DIGITS);
/** numeric(18,8): up to 10 integer digits and up to 8 fractional digits. */
const RATE_TO_USD_RE = /^\d{1,10}(\.\d{1,8})?$/;

export const USD = "USD";
/** A rate older than 7 days counts as missing (D4). Exactly 7 days is fresh. */
export const FX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Parses a numeric(18,8) rate string into fixed-point BigInt with 8 digits. */
export function parseRateToUsd(rate: string): bigint {
  if (typeof rate !== "string" || !RATE_TO_USD_RE.test(rate)) {
    throw new InvalidMoneyError(
      `rateToUsd must be a numeric(18,8) string, got: ${String(rate)}`,
    );
  }
  const [intPart, fracPart = ""] = rate.split(".");
  const fracPadded = fracPart.padEnd(RATE_SCALE_DIGITS, "0");
  return BigInt(intPart + fracPadded);
}

export function formatRateToUsd(scaled: bigint): string {
  const digits = scaled.toString().padStart(RATE_SCALE_DIGITS + 1, "0");
  const intPart = digits.slice(0, -RATE_SCALE_DIGITS);
  const fracPart = digits.slice(-RATE_SCALE_DIGITS).replace(/0+$/, "");
  return fracPart.length > 0 ? `${intPart}.${fracPart}` : intPart;
}

function isFreshRate(rate: FxRate, now: Date): boolean {
  return now.getTime() - rate.asOf.getTime() <= FX_MAX_AGE_MS;
}

/**
 * Keeps the freshest rate per currency. fx_rates is keyed by (currency,
 * as_of), so callers may pass history; comparisons use the latest row.
 */
export function selectFreshestRates(
  rates: readonly FxRate[],
): Map<string, FxRate> {
  const freshest = new Map<string, FxRate>();
  for (const rate of rates) {
    assertCurrency(rate.currency);
    const existing = freshest.get(rate.currency);
    if (!existing || rate.asOf.getTime() > existing.asOf.getTime()) {
      freshest.set(rate.currency, rate);
    }
  }
  return freshest;
}

export type SalaryComparisonReason =
  "basis" | "period" | "fx_missing" | "fx_stale";

export type SalaryComparison =
  | {
      comparable: true;
      /** Both amounts in `currency`. If a side has period "hour" (D5: hour
       * converts to nothing), the value is hourly minor units — hour can only
       * be compared against hour. */
      jobMonthlyMinor: bigint;
      candMonthlyMinor: bigint;
      currency: string;
    }
  | { comparable: false; reason: SalaryComparisonReason };

function convertToUsd(
  amountMinor: bigint,
  currency: string,
  rates: Map<string, bigint>,
): bigint {
  // Every involved currency has an entry; USD carries the identity rate.
  return divRoundHalfEven(amountMinor * rates.get(currency)!, RATE_SCALE);
}

/**
 * Salary comparability (10.4.1–10.4.3, D4, D5). Checks in order: basis,
 * period, fx availability, fx freshness. Uncomparable pairs stay neutral —
 * the score component is skipped, never guessed.
 */
export function compareSalaries(
  job: SalaryAmount,
  candidate: SalaryAmount,
  fxRates: readonly FxRate[],
  now: Date,
): SalaryComparison {
  validateSalaryAmount(job);
  validateSalaryAmount(candidate);

  if (job.basis !== candidate.basis) {
    return { comparable: false, reason: "basis" };
  }

  const jobMonthly = toMonthlyMinor(job.amountMinor, job.period);
  const candMonthly = toMonthlyMinor(candidate.amountMinor, candidate.period);
  // Exactly one side is "hour" → periods can never meet (D5).
  if (jobMonthly === null || candMonthly === null) {
    if (jobMonthly === null && candMonthly === null) {
      return {
        comparable: true,
        jobMonthlyMinor: job.amountMinor,
        candMonthlyMinor: candidate.amountMinor,
        currency: job.currency,
      };
    }
    return { comparable: false, reason: "period" };
  }

  if (job.currency === candidate.currency) {
    return {
      comparable: true,
      jobMonthlyMinor: jobMonthly,
      candMonthlyMinor: candMonthly,
      currency: job.currency,
    };
  }

  const freshest = selectFreshestRates(fxRates);
  const scaledRates = new Map<string, bigint>();
  scaledRates.set(USD, RATE_SCALE); // USD is the pivot; identity rate
  for (const currency of [job.currency, candidate.currency]) {
    if (scaledRates.has(currency)) continue;
    const rate = freshest.get(currency);
    if (!rate) {
      return { comparable: false, reason: "fx_missing" };
    }
    scaledRates.set(currency, parseRateToUsd(rate.rateToUsd));
  }
  for (const currency of [job.currency, candidate.currency]) {
    if (currency === USD) continue;
    if (!isFreshRate(freshest.get(currency)!, now)) {
      return { comparable: false, reason: "fx_stale" };
    }
  }

  const jobUsd = convertToUsd(jobMonthly, job.currency, scaledRates);
  const candUsd = convertToUsd(candMonthly, candidate.currency, scaledRates);
  return {
    comparable: true,
    jobMonthlyMinor: jobUsd,
    candMonthlyMinor: candUsd,
    currency: USD,
  };
}

function validateSalaryAmount(amount: SalaryAmount): void {
  assertCurrency(amount.currency);
  assertPeriod(amount.period);
  assertBasis(amount.basis);
  if (
    typeof amount.amountMinor !== "bigint" ||
    amount.amountMinor < BigInt(0)
  ) {
    throw new InvalidMoneyError(
      "amountMinor must be a non-negative BigInt in minor units",
    );
  }
}

export type SalaryScoreNeutralReason =
  "job_salary_missing" | "candidate_salary_missing" | "candidate_salary_zero";

export type SalaryScore =
  | { kind: "score"; score: number }
  | { kind: "neutral"; reason: SalaryScoreNeutralReason };

/**
 * Salary score component (10.4.4, D67). J and C are BigInt minor units in one
 * currency and period (compareSalaries normalizes first). J ≥ C → 1; else
 * s = max(0, (J/C − 0.7) / 0.3) computed as the exact BigInt ratio
 * (10·J − 7·C) / (3·C), evaluated to a number only at the last step.
 */
export function salaryScore(
  jobMinor: bigint | null,
  candMinor: bigint | null,
): SalaryScore {
  if (jobMinor === null) {
    return { kind: "neutral", reason: "job_salary_missing" };
  }
  if (candMinor === null) {
    return { kind: "neutral", reason: "candidate_salary_missing" };
  }
  if (candMinor === BigInt(0)) {
    return { kind: "neutral", reason: "candidate_salary_zero" };
  }
  if (jobMinor >= candMinor) {
    return { kind: "score", score: 1 };
  }
  const numerator = BigInt(10) * jobMinor - BigInt(7) * candMinor;
  if (numerator <= BigInt(0)) {
    return { kind: "score", score: 0 };
  }
  // numerator > 0 and jobMinor < candMinor pin the quotient to (0, 1).
  const denominator = BigInt(3) * candMinor;
  return { kind: "score", score: bigintRatio(numerator, denominator) };
}

/** num/den for non-negative BigInts, closest double, no intermediate float. */
function bigintRatio(num: bigint, den: bigint): number {
  const digits = 17;
  const scaled = (num * BigInt(10) ** BigInt(digits)) / den;
  return Number(scaled) / 10 ** digits;
}
