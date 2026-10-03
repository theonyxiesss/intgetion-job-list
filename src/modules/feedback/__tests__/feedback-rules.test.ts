import { describe, expect, it } from "vitest";
import {
  FEEDBACK_ACTIONS,
  HIDE_REASONS,
  InvalidFeedbackError,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  isFeedbackAction,
  isHideReason,
  isReportEntityType,
  isReportReason,
  withoutHidden,
  validateFeedbackEvent,
  type HiddenSets,
} from "../rules";

describe("feedback rules (4.1, D110)", () => {
  it("exposes the 8 enum actions and 6 hidden/dismissed reasons", () => {
    expect(FEEDBACK_ACTIONS).toEqual([
      "viewed",
      "saved",
      "unsaved",
      "applied",
      "applied_external",
      "dismissed",
      "hidden",
      "hidden_company",
    ]);
    expect(HIDE_REASONS).toEqual([
      "salary",
      "format",
      "timezone",
      "company",
      "role",
      "other",
    ]);
  });

  it("allows an optional valid reason for hidden and dismissed", () => {
    expect(validateFeedbackEvent("hidden", "salary")).toEqual({
      action: "hidden",
      reason: "salary",
    });
    expect(validateFeedbackEvent("dismissed", "other")).toEqual({
      action: "dismissed",
      reason: "other",
    });
    // Hiding without a stated reason is allowed (section 7: reason?).
    expect(validateFeedbackEvent("hidden", null)).toEqual({
      action: "hidden",
      reason: null,
    });
    expect(validateFeedbackEvent("hidden", undefined)).toEqual({
      action: "hidden",
      reason: null,
    });
    for (const bad of [
      () => validateFeedbackEvent("hidden", "because"),
      () => validateFeedbackEvent("dismissed", "money"),
      () => validateFeedbackEvent("made_up", null),
    ]) {
      expect(bad).toThrow(InvalidFeedbackError);
    }
  });

  it("forbids reasons on the other actions", () => {
    expect(validateFeedbackEvent("saved", null)).toEqual({
      action: "saved",
      reason: null,
    });
    for (const action of [
      "viewed",
      "saved",
      "unsaved",
      "applied",
      "applied_external",
      "hidden_company",
    ]) {
      expect(() => validateFeedbackEvent(action, "salary")).toThrow(
        InvalidFeedbackError,
      );
    }
  });

  it("checks type guards", () => {
    expect(isFeedbackAction("applied_external")).toBe(true);
    expect(isFeedbackAction("hidden_companyx")).toBe(false);
    expect(isHideReason("timezone")).toBe(true);
    expect(isHideReason("tz")).toBe(false);
    expect(isReportReason("scam")).toBe(true);
    expect(isReportReason("because")).toBe(false);
    expect(REPORT_REASONS).toHaveLength(7);
  });
});

describe("hidden filter (section 7, D110)", () => {
  const rows = [
    { job: { id: "j1" }, company: { id: "c1" } },
    { job: { id: "j2" }, company: { id: "c1" } },
    { job: { id: "j3" }, company: { id: "c2" } },
  ];
  const hidden: HiddenSets = {
    hiddenJobIds: new Set(["j1"]),
    hiddenCompanyIds: new Set(["c2"]),
  };

  it("drops hidden jobs and jobs of hidden companies", () => {
    expect(withoutHidden(rows, hidden).map((row) => row.job.id)).toEqual([
      "j2",
    ]);
  });

  it("keeps everything when the viewer has no hidden rows", () => {
    expect(withoutHidden(rows, null)).toEqual(rows);
    expect(
      withoutHidden(rows, {
        hiddenJobIds: new Set(),
        hiddenCompanyIds: new Set(),
      }),
    ).toEqual(rows);
  });
});

describe("report input rules (14.5, D111)", () => {
  it("caps details at 1000 characters", () => {
    expect(REPORT_DETAILS_MAX_LENGTH).toBe(1000);
    expect(isReportEntityType("job")).toBe(true);
    expect(isReportEntityType("listing")).toBe(false);
  });
});
