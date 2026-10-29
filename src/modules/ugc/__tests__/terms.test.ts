import { describe, expect, it } from "vitest";
import type { Campaign } from "../service/records";
import { assertTermsAgreed, buildTerms, termsHash } from "../service/terms";

const campaign = {
  id: "c",
  bountyMinor: BigInt(1500),
  deadline: "2099-10-20",
  rights: "organic",
  platforms: ["tiktok", "reels"],
  mustSay: "Say the name",
  mustNot: "No income promises",
  pitch: "Short video",
  exampleUrls: ["https://example.com/a"],
} as unknown as Campaign;

describe("terms snapshot (U3, D574)", () => {
  it("has the same hash for the same terms and a new one for any change", () => {
    const base = termsHash(buildTerms(campaign));
    expect(termsHash(buildTerms({ ...campaign }))).toBe(base);
    expect(
      termsHash(buildTerms({ ...campaign, platforms: ["reels", "tiktok"] })),
    ).toBe(base);
    for (const patch of [
      { bountyMinor: BigInt(1600) },
      { deadline: "2099-10-21" },
      { rights: "ads" as const },
      { mustSay: "Say more" },
      { mustNot: "Nothing" },
      { pitch: "Longer" },
      { exampleUrls: [] },
    ]) {
      expect(termsHash(buildTerms({ ...campaign, ...patch }))).not.toBe(base);
    }
  });

  it("carries the D574 licence and review terms", () => {
    expect(buildTerms(campaign)).toMatchObject({
      licenseMonths: 6,
      territory: "worldwide",
      reviewBusinessDays: 5,
      videos: 1,
    });
  });

  it("accepts an old offer without a snapshot", () => {
    expect(
      assertTermsAgreed({ snapshotHash: null, current: buildTerms(campaign) }),
    ).toBeNull();
  });

  it("agrees to unchanged terms, with or without the page's hash", () => {
    const hash = termsHash(buildTerms(campaign));
    const current = buildTerms(campaign);
    expect(assertTermsAgreed({ snapshotHash: hash, current })).toBe(hash);
    expect(
      assertTermsAgreed({ snapshotHash: hash, current, sentHash: hash }),
    ).toBe(hash);
  });

  it("refuses when the brief changed or the page showed other terms", () => {
    const hash = termsHash(buildTerms(campaign));
    const changed = buildTerms({ ...campaign, mustSay: "New" });
    expect(() =>
      assertTermsAgreed({ snapshotHash: hash, current: changed }),
    ).toThrowError(
      expect.objectContaining({ status: 409, code: "UGC_TERMS_CHANGED" }),
    );
    expect(() =>
      assertTermsAgreed({
        snapshotHash: hash,
        current: buildTerms(campaign),
        sentHash: "other",
      }),
    ).toThrowError(
      expect.objectContaining({ status: 409, code: "UGC_TERMS_MISMATCH" }),
    );
  });
});
