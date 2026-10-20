import { describe, expect, it } from "vitest";
import { HttpError } from "@/lib/http";
import {
  acceptsNewWork,
  assertHireRoom,
  assertHired,
  assertOfferRoom,
  assertRevisionAvailable,
  assertSubmissionUrl,
  assertWinnerRights,
  bountyAllowed,
  creatorMatches,
  hashJoinToken,
  participationFromApply,
  participationFromJoin,
  submissionHost,
  UGC_ERRORS,
  type CreatorMatchSide,
  type MatchSide,
} from "../service/rules";

const campaign: MatchSide = {
  platforms: ["reels"],
  languages: ["ru"],
  niches: ["app"],
  country: "DE",
};

function creator(patch: Partial<CreatorMatchSide> = {}): CreatorMatchSide {
  return {
    platforms: ["reels"],
    languages: ["ru"],
    niches: ["app"],
    country: "DE",
    status: "active",
    blocked: false,
    ...patch,
  };
}

describe("creator match (27.7)", () => {
  it("requires a shared platform, language and niche", () => {
    expect(creatorMatches(campaign, creator())).toBe(true);
    expect(creatorMatches(campaign, creator({ platforms: ["tiktok"] }))).toBe(
      false,
    );
    expect(creatorMatches(campaign, creator({ languages: ["en"] }))).toBe(
      false,
    );
    expect(creatorMatches(campaign, creator({ niches: ["finance"] }))).toBe(
      false,
    );
  });

  it("treats a missing country as any", () => {
    expect(creatorMatches(campaign, creator({ country: null }))).toBe(true);
    expect(
      creatorMatches(
        { ...campaign, country: null },
        creator({ country: "JP" }),
      ),
    ).toBe(true);
    expect(creatorMatches(campaign, creator({ country: "JP" }))).toBe(false);
  });

  it("matches creators in any of several requested countries", () => {
    const multiCountry = { ...campaign, countries: ["IT", "ES", "DE"] };
    expect(creatorMatches(multiCountry, creator({ country: "IT" }))).toBe(true);
    expect(creatorMatches(multiCountry, creator({ country: "ES" }))).toBe(true);
    expect(creatorMatches(multiCountry, creator({ country: "JP" }))).toBe(
      false,
    );
  });

  it("skips a paused or blocked creator", () => {
    expect(creatorMatches(campaign, creator({ status: "paused" }))).toBe(false);
    expect(creatorMatches(campaign, creator({ blocked: true }))).toBe(false);
  });
});

describe("bounty and links", () => {
  it("keeps the bounty between $5 and $500", () => {
    expect(bountyAllowed(BigInt(500))).toBe(true);
    expect(bountyAllowed(BigInt(50_000))).toBe(true);
    expect(bountyAllowed(BigInt(499))).toBe(false);
    expect(bountyAllowed(BigInt(50_001))).toBe(false);
  });

  it("accepts only https hosts from the list and does not fetch", () => {
    expect(submissionHost("https://www.youtube.com/watch?v=abc")).toBe(
      "www.youtube.com",
    );
    expect(submissionHost("https://youtu.be/abc")).toBe("youtu.be");
    expect(submissionHost("http://www.youtube.com/watch?v=abc")).toBeNull();
    expect(submissionHost("https://drive.google.com/file")).toBeNull();
    expect(() => assertSubmissionUrl("https://evil.test/a")).toThrow(HttpError);
  });
});

describe("hire and delivery (27.4)", () => {
  it("starts an application and a join link as applied, not hired", () => {
    expect(participationFromApply()).toBe("applied");
    expect(participationFromJoin()).toBe("applied");
  });

  it("refuses a submission before hire", () => {
    expect(() => assertHired("applied")).toThrow(HttpError);
    try {
      assertHired("applied");
    } catch (error) {
      expect((error as HttpError).code).toBe(UGC_ERRORS.notHired);
    }
    expect(() => assertHired("hired")).not.toThrow();
  });

  it("stops hiring when every video slot is taken", () => {
    expect(() => assertHireRoom(2, 2)).toThrow(HttpError);
    expect(() => assertHireRoom(1, 2)).not.toThrow();
  });

  it("refuses a fourth offer to the same creator in a day", () => {
    expect(() =>
      assertOfferRoom({
        offersToCreatorToday: 3,
        openOffers: 0,
        hired: 0,
        videosWanted: 10,
      }),
    ).toThrow(HttpError);
  });

  it("allows one change request and refuses a second", () => {
    expect(() => assertRevisionAvailable(false)).not.toThrow();
    expect(() => assertRevisionAvailable(true)).toThrow(HttpError);
  });

  it("refuses an ad winner when the rights are organic only", () => {
    expect(() => assertWinnerRights("organic")).toThrow(HttpError);
    expect(() => assertWinnerRights("ads")).not.toThrow();
    expect(() => assertWinnerRights("whitelist")).not.toThrow();
  });

  it("stops new work after the deadline or once the campaign is closed", () => {
    expect(
      acceptsNewWork({
        status: "open",
        deadline: "2026-10-20",
        today: "2026-10-15",
      }),
    ).toBe(true);
    expect(
      acceptsNewWork({
        status: "open",
        deadline: "2026-10-15",
        today: "2026-10-16",
      }),
    ).toBe(false);
    expect(
      acceptsNewWork({
        status: "pending_review",
        deadline: "2026-10-20",
        today: "2026-10-15",
      }),
    ).toBe(false);
  });

  it("stores a hash of the join token, not the token", () => {
    const hash = hashJoinToken("ugc_secret");
    expect(hash).toHaveLength(64);
    expect(hash).not.toContain("secret");
  });
});
