import { describe, expect, it } from "vitest";
import { canSyndicateImportedSource, canSyndicateJob } from "./import-sources";

describe("imported jobs outside the site (D412)", () => {
  it("lets only Jobicy jobs into the channel and RSS", () => {
    expect(canSyndicateImportedSource("Jobicy")).toBe(true);
    for (const name of [
      "Remotive",
      "Himalayas",
      "Remote OK",
      "Fictional RSS Feed",
      "CryptoJobsList (snapshot 2026-10-04)",
      "",
      null,
      undefined,
    ]) {
      expect(canSyndicateImportedSource(name)).toBe(false);
    }
  });

  it("always lets our own jobs out", () => {
    expect(canSyndicateJob({ source: { type: "internal", name: null } })).toBe(
      true,
    );
    expect(
      canSyndicateJob({ source: { type: "imported", name: "Himalayas" } }),
    ).toBe(false);
    expect(
      canSyndicateJob({ source: { type: "imported", name: "Jobicy" } }),
    ).toBe(true);
  });
});
