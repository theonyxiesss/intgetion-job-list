import { describe, expect, it } from "vitest";
import { jobCardSummary } from "../ui/job-summary";

describe("jobCardSummary (D398)", () => {
  it("keeps a short description whole, without an ellipsis", () => {
    expect(jobCardSummary("Build payment flows.\n\nRemote.")).toBe(
      "Build payment flows. Remote.",
    );
  });

  it("returns null when nothing visible is left", () => {
    expect(jobCardSummary(null)).toBeNull();
    expect(jobCardSummary("   \n ")).toBeNull();
    expect(jobCardSummary("<p></p>")).toBeNull();
  });

  it("drops markup and markdown marks", () => {
    expect(jobCardSummary("<p>**Lead** the `api` team</p>")).toBe(
      "Lead the api team",
    );
  });

  it("cuts a long text at a word boundary and ends with an ellipsis", () => {
    const words = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const summary = jobCardSummary(words) ?? "";
    expect(summary.endsWith("…")).toBe(true);
    expect(summary.length).toBeLessThanOrEqual(241);
    const body = summary.slice(0, -1);
    // Every kept word is a whole word of the source.
    expect(body.split(" ").every((w) => /^word\d+$/.test(w))).toBe(true);
    expect(words.startsWith(body)).toBe(true);
  });

  it("does not leave punctuation before the ellipsis", () => {
    const text = `${"a".repeat(200)} tail, ${"b".repeat(60)}`;
    expect(jobCardSummary(text)).toBe(`${"a".repeat(200)} tail…`);
  });
});
