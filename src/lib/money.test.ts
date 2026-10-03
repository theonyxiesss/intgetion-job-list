import { describe, expect, it } from "vitest";
import {
  compareSalaries,
  CURRENCY_PATTERN,
  divRoundHalfEven,
  formatRateToUsd,
  InvalidMoneyError,
  jobSalaryReference,
  parseMoneyDto,
  parseRateToUsd,
  salaryScore,
  toMoneyDto,
  toMonthlyMinor,
  USD,
  type FxRate,
  type SalaryAmount,
} from "./money";

function salary(
  amountMinor: bigint,
  currency: string,
  period: SalaryAmount["period"],
  basis: SalaryAmount["basis"],
): SalaryAmount {
  return { amountMinor, currency, period, basis };
}

/** rate: 1 USD = `units` of the currency. */
function rate(currency: string, units: string, asOf: Date): FxRate {
  return { currency, rateToUsd: units, asOf };
}

const NOW = new Date("2026-10-03T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

describe("divRoundHalfEven (banker's rounding)", () => {
  it("rounds halves to the even quotient", () => {
    // 6/12=0.5→0, 18/12=1.5→2, 30/12=2.5→2, 42/12=3.5→4
    expect(divRoundHalfEven(BigInt(6), BigInt(12))).toBe(BigInt(0));
    expect(divRoundHalfEven(BigInt(18), BigInt(12))).toBe(BigInt(2));
    expect(divRoundHalfEven(BigInt(30), BigInt(12))).toBe(BigInt(2));
    expect(divRoundHalfEven(BigInt(42), BigInt(12))).toBe(BigInt(4));
  });

  it("rounds non-halves to nearest", () => {
    expect(divRoundHalfEven(BigInt(100000000000000000), BigInt(12))).toBe(
      BigInt(8333333333333333),
    );
    expect(divRoundHalfEven(BigInt(119), BigInt(12))).toBe(BigInt(10)); // 9.916… → 10
    expect(divRoundHalfEven(BigInt(113), BigInt(12))).toBe(BigInt(9)); // 9.416… → 9
  });

  it("rejects zero divisor and negative dividend", () => {
    expect(() => divRoundHalfEven(BigInt(1), BigInt(0))).toThrow(
      InvalidMoneyError,
    );
    expect(() => divRoundHalfEven(-BigInt(1), BigInt(12))).toThrow(
      InvalidMoneyError,
    );
  });
});

describe("toMonthlyMinor (period normalization, 10.4.1)", () => {
  it("divides year by 12 with banker's rounding in minor units", () => {
    expect(toMonthlyMinor(BigInt(18), "year")).toBe(BigInt(2));
    expect(toMonthlyMinor(BigInt(6), "year")).toBe(BigInt(0));
  });

  it("keeps month and refuses hour", () => {
    expect(toMonthlyMinor(BigInt(2500), "month")).toBe(BigInt(2500));
    expect(toMonthlyMinor(BigInt(2500), "hour")).toBeNull();
  });
});

describe("big amounts beyond 2^53 (D19)", () => {
  it("parses, converts and serializes without overflow", () => {
    const big = BigInt(10) ** BigInt(17); // > 2^53 ≈ 9.007e15
    const dto = toMoneyDto(big, "USD", "year", "gross");
    expect(dto.amountMinor).toBe("100000000000000000");
    const parsed = parseMoneyDto(dto);
    expect(parsed.amountMinor).toBe(big);
    expect(toMonthlyMinor(big, "year")).toBe(BigInt(8333333333333333));
  });

  it("keeps exactness when converting through fx", () => {
    const job = salary(BigInt(10) ** BigInt(17), "EUR", "month", "gross");
    const cand = salary(BigInt(1), "USD", "month", "gross");
    const rates = [rate("EUR", "1.10000000", NOW)];
    const result = compareSalaries(job, cand, rates, NOW);
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(110000000000000000),
      candMonthlyMinor: BigInt(1),
      currency: USD,
    });
  });
});

describe("zeros", () => {
  it("serializes, parses and compares zero amounts", () => {
    const dto = toMoneyDto(BigInt(0), "USD", "month", "net");
    expect(dto.amountMinor).toBe("0");
    expect(parseMoneyDto(dto).amountMinor).toBe(BigInt(0));
    expect(toMonthlyMinor(BigInt(0), "year")).toBe(BigInt(0));

    const result = compareSalaries(
      salary(BigInt(0), "USD", "month", "gross"),
      salary(BigInt(0), "USD", "month", "gross"),
      [],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(0),
      candMonthlyMinor: BigInt(0),
      currency: "USD",
    });
    expect(salaryScore(BigInt(0), BigInt(1))).toEqual({
      kind: "score",
      score: 0,
    });
  });
});

describe("money DTO round-trip (spec 6)", () => {
  it("serializes and parses back", () => {
    const dto = toMoneyDto(BigInt(1234567), "EUR", "year", "net");
    expect(dto).toEqual({
      amountMinor: "1234567",
      currency: "EUR",
      period: "year",
      basis: "net",
    });
    expect(parseMoneyDto(JSON.parse(JSON.stringify(dto)))).toEqual({
      amountMinor: BigInt(1234567),
      currency: "EUR",
      period: "year",
      basis: "net",
    });
  });

  it("rejects garbage instead of returning a quiet zero", () => {
    const valid = toMoneyDto(BigInt(100), "USD", "month", "gross");
    for (const amount of ["-1", "1.5", "1e5", "", " 1", "abc", "١٢", 100]) {
      expect(() => parseMoneyDto({ ...valid, amountMinor: amount })).toThrow(
        InvalidMoneyError,
      );
    }
    for (const currency of ["usd", "US", "USDD", "US1", 123, null]) {
      expect(() => parseMoneyDto({ ...valid, currency })).toThrow(
        InvalidMoneyError,
      );
    }
    for (const period of ["weekly", "MONTH", null, 42]) {
      expect(() => parseMoneyDto({ ...valid, period })).toThrow(
        InvalidMoneyError,
      );
    }
    for (const basis of ["GROSS", "neto", null, 0]) {
      expect(() => parseMoneyDto({ ...valid, basis })).toThrow(
        InvalidMoneyError,
      );
    }
    for (const garbage of [null, "100", 42, [], {}]) {
      expect(() => parseMoneyDto(garbage)).toThrow(InvalidMoneyError);
    }
    expect(() => toMoneyDto(-BigInt(1), "USD", "month", "gross")).toThrow(
      InvalidMoneyError,
    );
    expect(() =>
      toMoneyDto(100 as unknown as bigint, "USD", "month", "gross"),
    ).toThrow(InvalidMoneyError);
  });

  it("exposes the currency pattern for zod schemas", () => {
    const pattern = new RegExp(CURRENCY_PATTERN);
    expect(pattern.test("USD")).toBe(true);
    expect(pattern.test("usd")).toBe(false);
  });
});

describe("compareSalaries neutral cases (D4, D5)", () => {
  it("is neutral on gross vs net", () => {
    const result = compareSalaries(
      salary(BigInt(300000), "EUR", "month", "gross"),
      salary(BigInt(300000), "EUR", "month", "net"),
      [rate("EUR", "1.10000000", NOW)],
      NOW,
    );
    expect(result).toEqual({ comparable: false, reason: "basis" });
  });

  it("is neutral on hour vs month and hour vs year", () => {
    const cand = salary(BigInt(5000), "EUR", "month", "gross");
    expect(
      compareSalaries(
        salary(BigInt(5000), "EUR", "hour", "gross"),
        cand,
        [],
        NOW,
      ),
    ).toEqual({ comparable: false, reason: "period" });
    expect(
      compareSalaries(
        salary(BigInt(5000), "EUR", "hour", "gross"),
        salary(BigInt(60000), "EUR", "year", "gross"),
        [],
        NOW,
      ),
    ).toEqual({ comparable: false, reason: "period" });
  });

  it("compares hour against hour without conversion", () => {
    const result = compareSalaries(
      salary(BigInt(5000), "EUR", "hour", "gross"),
      salary(BigInt(4000), "EUR", "hour", "gross"),
      [],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(5000),
      candMonthlyMinor: BigInt(4000),
      currency: "EUR",
    });
  });

  it("normalizes year to month when periods meet", () => {
    const result = compareSalaries(
      salary(BigInt(6000000), "EUR", "year", "gross"),
      salary(BigInt(500000), "EUR", "month", "gross"),
      [],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(500000),
      candMonthlyMinor: BigInt(500000),
      currency: "EUR",
    });
  });

  it("is neutral when a currency has no rate at all", () => {
    const result = compareSalaries(
      salary(BigInt(300000), "EUR", "month", "gross"),
      salary(BigInt(300000), "USD", "month", "gross"),
      [rate("GBP", "1.27000000", NOW)],
      NOW,
    );
    expect(result).toEqual({ comparable: false, reason: "fx_missing" });
  });

  it("is neutral when only one side lacks a rate (missing wins over stale)", () => {
    const result = compareSalaries(
      salary(BigInt(300000), "EUR", "month", "gross"),
      salary(BigInt(300000), "GBP", "month", "gross"),
      [rate("GBP", "1.27000000", new Date(NOW.getTime() - 8 * DAY_MS))],
      NOW,
    );
    expect(result).toEqual({ comparable: false, reason: "fx_missing" });
  });

  it("treats a rate exactly 7 days old as fresh", () => {
    const result = compareSalaries(
      salary(BigInt(300000), "EUR", "month", "gross"),
      salary(BigInt(300000), "USD", "month", "gross"),
      [rate("EUR", "1.10000000", new Date(NOW.getTime() - 7 * DAY_MS))],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(330000),
      candMonthlyMinor: BigInt(300000),
      currency: USD,
    });
  });

  it("is neutral 7 days and 1 ms past the rate", () => {
    const result = compareSalaries(
      salary(BigInt(300000), "EUR", "month", "gross"),
      salary(BigInt(300000), "USD", "month", "gross"),
      [rate("EUR", "1.10000000", new Date(NOW.getTime() - (7 * DAY_MS + 1)))],
      NOW,
    );
    expect(result).toEqual({ comparable: false, reason: "fx_stale" });
  });
});

describe("compareSalaries through USD", () => {
  it("converts two currencies via USD with fixed-point arithmetic", () => {
    const result = compareSalaries(
      salary(BigInt(100000), "EUR", "month", "gross"), // 1000.00 EUR
      salary(BigInt(100000), "GBP", "month", "gross"), // 1000.00 GBP
      [rate("EUR", "1.10000000", NOW), rate("GBP", "1.27000000", NOW)],
      NOW,
    );
    // 1000 EUR = 1100.00 USD; 1000 GBP = 1270.00 USD
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(110000),
      candMonthlyMinor: BigInt(127000),
      currency: USD,
    });
  });

  it("rounds conversions with banker's rounding", () => {
    // 9995 cents * 1.125 = 11244.375 → 11244 (even)
    const result = compareSalaries(
      salary(BigInt(9995), "EUR", "month", "gross"),
      salary(BigInt(11245), "USD", "month", "gross"),
      [rate("EUR", "1.12500000", NOW)],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(11244),
      candMonthlyMinor: BigInt(11245),
      currency: USD,
    });
  });

  it("uses the freshest rate when history is passed", () => {
    const result = compareSalaries(
      salary(BigInt(100000), "EUR", "month", "gross"),
      salary(BigInt(100000), "USD", "month", "gross"),
      [
        rate("EUR", "1.00000000", new Date(NOW.getTime() - 2 * DAY_MS)),
        rate("EUR", "1.20000000", new Date(NOW.getTime() - 1 * DAY_MS)),
      ],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(120000),
      candMonthlyMinor: BigInt(100000),
      currency: USD,
    });
  });

  it("keeps the freshest rate when history comes newest first", () => {
    const result = compareSalaries(
      salary(BigInt(100000), "EUR", "month", "gross"),
      salary(BigInt(100000), "USD", "month", "gross"),
      [
        rate("EUR", "1.20000000", new Date(NOW.getTime() - 1 * DAY_MS)),
        rate("EUR", "1.00000000", new Date(NOW.getTime() - 2 * DAY_MS)),
      ],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(120000),
      candMonthlyMinor: BigInt(100000),
      currency: USD,
    });
  });

  it("needs no rate when a side is already USD", () => {
    const result = compareSalaries(
      salary(BigInt(100000), "USD", "month", "gross"), // 1000.00 USD
      salary(BigInt(110000), "EUR", "month", "gross"), // 1100.00 EUR → 1210.00 USD
      [rate("EUR", "1.10000000", NOW)],
      NOW,
    );
    expect(result).toEqual({
      comparable: true,
      jobMonthlyMinor: BigInt(100000),
      candMonthlyMinor: BigInt(121000),
      currency: USD,
    });
  });

  it("rejects malformed amounts and float rates", () => {
    expect(() =>
      compareSalaries(
        salary(BigInt(100000), "usd", "month", "gross"),
        salary(BigInt(100000), "USD", "month", "gross"),
        [],
        NOW,
      ),
    ).toThrow(InvalidMoneyError);
    expect(() =>
      compareSalaries(
        salary(-BigInt(1), "USD", "month", "gross"),
        salary(BigInt(100000), "USD", "month", "gross"),
        [],
        NOW,
      ),
    ).toThrow(InvalidMoneyError);
    expect(() => parseRateToUsd("1.125000001")).toThrow(InvalidMoneyError);
    expect(() => parseRateToUsd(1.1 as unknown as string)).toThrow(
      InvalidMoneyError,
    );
    expect(parseRateToUsd("1.1")).toBe(BigInt(110000000));
    expect(parseRateToUsd("2")).toBe(BigInt(200000000));
    expect(formatRateToUsd(BigInt(110000000))).toBe("1.1");
    expect(formatRateToUsd(BigInt(200000000))).toBe("2");
  });
});

describe("salaryScore (10.4.4, D67)", () => {
  it("returns 1 when J ≥ C", () => {
    expect(salaryScore(BigInt(5000), BigInt(5000))).toEqual({
      kind: "score",
      score: 1,
    });
    expect(salaryScore(BigInt(6000), BigInt(5000))).toEqual({
      kind: "score",
      score: 1,
    });
  });

  it("returns 0.5 at J/C = 0.85", () => {
    expect(salaryScore(BigInt(8500), BigInt(10000))).toEqual({
      kind: "score",
      score: 0.5,
    });
  });

  it("returns 0 at and below J/C = 0.7", () => {
    expect(salaryScore(BigInt(7000), BigInt(10000))).toEqual({
      kind: "score",
      score: 0,
    });
    expect(salaryScore(BigInt(5000), BigInt(10000))).toEqual({
      kind: "score",
      score: 0,
    });
  });

  it("computes intermediate values from BigInt without precision loss", () => {
    // (0.75 − 0.7)/0.3 = 1/6
    const result = salaryScore(BigInt(7500), BigInt(10000));
    expect(result).toEqual({ kind: "score", score: 1 / 6 });

    const big = salaryScore(
      BigInt(15) * BigInt(10) ** BigInt(16) + BigInt(1),
      BigInt(2) * BigInt(10) ** BigInt(17),
    );
    expect(big.kind).toBe("score");
    if (big.kind === "score") {
      expect(big.score).toBeGreaterThan(0);
      expect(big.score).toBeLessThan(1);
    }
  });

  it("names neutral cases explicitly", () => {
    expect(salaryScore(null, BigInt(1000))).toEqual({
      kind: "neutral",
      reason: "job_salary_missing",
    });
    expect(salaryScore(BigInt(1000), null)).toEqual({
      kind: "neutral",
      reason: "candidate_salary_missing",
    });
    expect(salaryScore(BigInt(1000), BigInt(0))).toEqual({
      kind: "neutral",
      reason: "candidate_salary_zero",
    });
    expect(salaryScore(null, null)).toEqual({
      kind: "neutral",
      reason: "job_salary_missing",
    });
  });
});

describe("jobSalaryReference (10.4.4)", () => {
  it("prefers salary_max and falls back to salary_min", () => {
    expect(jobSalaryReference(BigInt(1000), BigInt(2000))).toBe(BigInt(2000));
    expect(jobSalaryReference(BigInt(1000), null)).toBe(BigInt(1000));
    expect(jobSalaryReference(null, null)).toBeNull();
  });
});
