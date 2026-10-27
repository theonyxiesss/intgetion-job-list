import { describe, expect, it } from "vitest";
import { afterJobResults, NO_JOBS_YET } from "./no-jobs";

describe("web search offer after job results (D559)", () => {
  it("offers it when the only search is empty", () => {
    expect(afterJobResults(NO_JOBS_YET, 0).offerWeb).toBe(true);
  });

  it("does not offer it when a later search is empty after jobs were shown", () => {
    const first = afterJobResults(NO_JOBS_YET, 5);
    expect(first.offerWeb).toBe(false);
    expect(afterJobResults(first, 0).offerWeb).toBe(false);
  });

  it("drops the offer when a later search finds jobs", () => {
    const empty = afterJobResults(NO_JOBS_YET, 0);
    expect(afterJobResults(empty, 3).offerWeb).toBe(false);
  });
});
