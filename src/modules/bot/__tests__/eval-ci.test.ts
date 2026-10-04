import { describe, expect, it } from "vitest";
import {
  SKILL_RECALL_MIN,
  TIMEZONE_ERRORS_MAX,
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
