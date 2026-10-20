import { describe, expect, it } from "vitest";
import { applySharedPatch, EMPTY_PROFILE } from "../service";

const anna = {
  ...EMPTY_PROFILE,
  displayName: "Anna",
  country: "PL",
  city: "Warsaw",
  timezone: "Europe/Warsaw",
  languages: [
    { code: "pl", level: "native" },
    { code: "en", level: "B2" },
  ],
};

describe("Spoki patch of the shared profile (D505)", () => {
  it("changes only the named fields", () => {
    expect(
      applySharedPatch(anna, {
        country: "de",
        city: "Berlin",
        timezone: "Europe/Berlin",
      }),
    ).toEqual({
      ...anna,
      country: "DE",
      city: "Berlin",
      timezone: "Europe/Berlin",
    });
  });

  it("adds, updates and removes languages", () => {
    expect(
      applySharedPatch(anna, {
        addLanguages: [
          { code: "DE", level: "A2" },
          { code: "en", level: "C1" },
        ],
        removeLanguages: ["pl"],
      }).languages,
    ).toEqual([
      { code: "en", level: "C1" },
      { code: "de", level: "A2" },
    ]);
  });

  it("starts a profile for a person who had none", () => {
    expect(applySharedPatch(null, { displayName: "Ola" })).toEqual({
      ...EMPTY_PROFILE,
      displayName: "Ola",
    });
  });

  it("drops invalid values instead of storing them", () => {
    expect(
      applySharedPatch(anna, { country: "Germany", timezone: "Nowhere/City" }),
    ).toEqual(anna);
  });
});
