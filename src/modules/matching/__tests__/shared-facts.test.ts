import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { factsForMatching, UNKNOWN_LEVEL } from "../service/shared-facts";

const candidate = {
  country: "PL",
  timezone: "Europe/Warsaw",
  languages: [
    { lang: "pl", level: "native" as const },
    { lang: "en", level: "C1" as const },
  ],
};

describe("job matching reads the shared profile (D507)", () => {
  it("keeps the candidate row while there is no shared profile", () => {
    expect(factsForMatching(candidate, null)).toEqual(candidate);
  });

  it("takes country, time zone and languages from the shared profile", () => {
    expect(
      factsForMatching(candidate, {
        country: "DE",
        timezone: "Europe/Berlin",
        languages: [
          { code: "de", level: "B2" },
          { code: "en", level: null },
          { code: "fr", level: null },
        ],
      }),
    ).toEqual({
      country: "DE",
      timezone: "Europe/Berlin",
      languages: [
        { lang: "de", level: "B2" },
        { lang: "en", level: "C1" },
        { lang: "fr", level: UNKNOWN_LEVEL },
      ],
    });
  });

  it("falls back field by field when the shared one is empty", () => {
    expect(
      factsForMatching(candidate, {
        country: null,
        timezone: null,
        languages: [],
      }),
    ).toEqual(candidate);
  });

  it("filters candidates by the shared country in the database prefilter", () => {
    const repo = readFileSync(
      join(process.cwd(), "src/modules/matching/repo/matching-repo.ts"),
      "utf8",
    );
    expect(repo).toContain(
      "left join public.user_profiles up on up.user_id = p.user_id",
    );
    expect(repo).toContain(
      "coalesce(up.country, p.country) = any(j.country_restrictions)",
    );
    expect(repo).not.toMatch(/p\.country = any\(j\.country_restrictions\)/);
  });
});
