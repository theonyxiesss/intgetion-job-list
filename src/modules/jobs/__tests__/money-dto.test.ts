import { describe, expect, it } from "vitest";
import { toJobMoneyDto } from "../api/money-dto";

describe("temporary 3B money DTO adapter", () => {
  it("serializes bigint minor units as a decimal string", () => {
    expect(
      toJobMoneyDto({
        amountMinor: BigInt("9007199254740993"),
        currency: "EUR",
        period: "month",
        basis: "gross",
      }),
    ).toEqual({
      amountMinor: "9007199254740993",
      currency: "EUR",
      period: "month",
      basis: "gross",
    });
  });

  it("returns null when a salary is incomplete", () => {
    expect(
      toJobMoneyDto({
        amountMinor: null,
        currency: "EUR",
        period: "month",
        basis: "gross",
      }),
    ).toBeNull();
    expect(
      toJobMoneyDto({
        amountMinor: BigInt("100"),
        currency: null,
        period: null,
        basis: null,
      }),
    ).toBeNull();
  });
});
