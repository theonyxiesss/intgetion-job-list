import { describe, expect, it } from "vitest";
import {
  SKILL_RECALL_MIN,
  TIMEZONE_ERRORS_MAX,
  pricesInText,
  runFreelanceEvals,
  runMemoryEvals,
  runUgcPriceEvals,
  runRecordedEvals,
} from "../service/eval-run";

describe("recorded evals (19.3, P10)", () => {
  it("clears the skill and timezone bars and refuses adversarial cases", async () => {
    const report = await runRecordedEvals();
    expect(report.dialogs).toBe(20);
    expect(report.adversarial).toBeGreaterThanOrEqual(15);
    expect(report.skillRecall).toBeGreaterThanOrEqual(SKILL_RECALL_MIN);
    expect(report.timezoneErrors).toBe(TIMEZONE_ERRORS_MAX);
  });
});

describe("freelance evals (28.8, D460)", () => {
  it("names only listed prices, no contacts, and every write is a card", async () => {
    const report = await runFreelanceEvals();
    expect(report.cases).toBeGreaterThanOrEqual(10);
    expect(report.prices).toBeGreaterThanOrEqual(5);
  });

  it("reads dollar amounts in the forms Spoki writes", () => {
    expect(pricesInText("basic $450, pro $1,200.50 or 300 USD")).toEqual([
      BigInt(45000),
      BigInt(120050),
      BigInt(30000),
    ]);
  });
});

describe("UGC reward evals (D464)", () => {
  it("names only guide amounts and budgets made of them", async () => {
    expect((await runUgcPriceEvals()).cases).toBeGreaterThanOrEqual(5);
  });
});

describe("memory evals (D469)", () => {
  it("does not ask again what the profile or memory holds, and keeps no contacts", async () => {
    const report = await runMemoryEvals();
    expect(report.cases).toBeGreaterThanOrEqual(8);
    expect(report.kept).toBeGreaterThanOrEqual(2);
  });
});
