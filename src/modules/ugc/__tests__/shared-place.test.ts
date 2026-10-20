import { describe, expect, it } from "vitest";
import { creatorMatches, withSharedPlace } from "../service/rules";

const creator = {
  languages: ["en"],
  country: null as string | null,
  platforms: ["tiktok" as const],
  niches: ["app" as const],
};

describe("creator matching reads the shared profile (D507)", () => {
  it("keeps the creator row without a shared profile", () => {
    expect(withSharedPlace(creator, null)).toEqual(creator);
  });

  it("takes languages and country from the shared profile", () => {
    const merged = withSharedPlace(creator, {
      country: "PL",
      languages: [{ code: "pl" }, { code: "en" }],
    });
    expect(merged.languages).toEqual(["pl", "en"]);
    expect(merged.country).toBe("PL");
    const brief = {
      platforms: ["tiktok" as const],
      languages: ["pl"],
      niches: ["app" as const],
      country: null,
      countries: ["DE"],
    };
    expect(
      creatorMatches(brief, { ...creator, status: "active", blocked: false }),
    ).toBe(false);
    expect(
      creatorMatches(
        { ...brief, countries: ["PL"] },
        { ...merged, status: "active", blocked: false },
      ),
    ).toBe(true);
  });

  it("keeps the creator's own values where the shared ones are empty", () => {
    expect(
      withSharedPlace(
        { ...creator, country: "DE" },
        { country: null, languages: [] },
      ),
    ).toEqual({ ...creator, country: "DE" });
  });
});
