import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMPTY_PROFILE,
  mergeSharedFacts,
  type SharedProfile,
} from "../service";

const anna: SharedProfile = {
  displayName: "Anna Kowalska",
  country: "PL",
  city: "Warsaw",
  timezone: "Europe/Warsaw",
  languages: [
    { code: "pl", level: "native" },
    { code: "en", level: "C1" },
  ],
  about: null,
};

describe("shared profile (D503)", () => {
  it("starts a profile from the first role form", () => {
    expect(
      mergeSharedFacts(
        null,
        {
          displayName: "  Anna Kowalska ",
          country: "pl",
          city: "Warsaw",
          timezone: "Europe/Warsaw",
          languages: [
            { code: "PL", level: "native" },
            { code: "en", level: "C1" },
            { code: "en", level: "B2" },
          ],
        },
        "replace",
      ),
    ).toEqual(anna);
  });

  it("lets the candidate and employer forms overwrite the name and place", () => {
    expect(
      mergeSharedFacts(
        anna,
        { displayName: "Anna Nowak", city: "Kraków" },
        "replace",
      ),
    ).toEqual({ ...anna, displayName: "Anna Nowak", city: "Kraków" });
  });

  it("lets a creator nickname only fill what is empty, and adds new languages", () => {
    expect(
      mergeSharedFacts(
        anna,
        {
          displayName: "glowwithanna",
          country: "DE",
          languages: [{ code: "pl" }, { code: "de" }],
        },
        "fill",
      ),
    ).toEqual({
      ...anna,
      languages: [...anna.languages, { code: "de", level: null }],
    });
    expect(
      mergeSharedFacts(null, { displayName: "glowwithanna" }, "fill"),
    ).toEqual({ ...EMPTY_PROFILE, displayName: "glowwithanna" });
  });

  it("never clears a field and drops invalid values", () => {
    expect(
      mergeSharedFacts(
        anna,
        {
          displayName: "  ",
          country: "Poland",
          city: null,
          timezone: "Mars/Olympus",
          languages: [{ code: "english", level: "C1" }],
        },
        "replace",
      ),
    ).toBeNull();
  });

  it("reports no change when nothing new was said", () => {
    expect(mergeSharedFacts(anna, { country: "PL" }, "replace")).toBeNull();
    expect(mergeSharedFacts(null, {}, "replace")).toBeNull();
  });

  it("keeps an unknown language level out", () => {
    expect(
      mergeSharedFacts(
        null,
        { languages: [{ code: "en", level: "fluent" }] },
        "replace",
      )?.languages,
    ).toEqual([{ code: "en", level: null }]);
  });

  it("exports and deletes the shared profile with the account (17-gdpr)", () => {
    const privacy = readFileSync(
      join(process.cwd(), "src/modules/privacy/repo/privacy-repo.ts"),
      "utf8",
    );
    expect(privacy).toContain("from public.user_profiles where user_id");
    expect(privacy).toContain("delete from public.user_profiles");
  });

  it("migration 0064 fills from the candidate, then the employer, then the creator name", () => {
    const sql = readFileSync(
      join(process.cwd(), "src/db/migrations/0064_user_profiles.sql"),
      "utf8",
    );
    expect(sql).toContain("enable_rls_deny_all('public.user_profiles')");
    expect(sql).toMatch(
      /NULLIF\(btrim\(cp\.full_name\), ''\),\s*NULLIF\(btrim\(ep\.full_name\), ''\),\s*NULLIF\(btrim\(cr\.display_name\), ''\)/,
    );
    expect(sql).toContain("u.status <> 'deleted'");
    expect(sql).toContain("ON CONFLICT (user_id) DO NOTHING");
  });
});

describe("a list without levels keeps the known ones (D507)", () => {
  it("replaces the languages and keeps the level of a language already known", () => {
    expect(
      mergeSharedFacts(
        anna,
        { languages: [{ code: "en" }, { code: "de" }] },
        "replace",
      )?.languages,
    ).toEqual([
      { code: "en", level: "C1" },
      { code: "de", level: null },
    ]);
  });
});
