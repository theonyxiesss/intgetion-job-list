import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { presentProfile } from "../repo/profiles";

type Loaded = Parameters<typeof presentProfile>[0];

function loaded(shared: Loaded["shared"]): Loaded {
  return {
    profile: {
      userId: "u1",
      fullName: "Old Name",
      headline: null,
      desiredTitles: [],
      country: "PL",
      city: "Warsaw",
      timezone: "Europe/Warsaw",
      workHoursStart: "09:00:00",
      workHoursEnd: "18:00:00",
      workDays: [1, 2, 3, 4, 5],
      workFormats: ["remote"],
      employmentTypes: ["full_time"],
      experienceYears: null,
      availabilityDate: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryBasis: null,
      minOverlapHours: 3,
      summary: null,
      isHidden: false,
      jobSearchStatus: "active",
      completeness: 40,
    },
    skills: [],
    experience: [],
    languages: [{ candidateId: "u1", lang: "en", level: "C1" }],
    preferences: null,
    shared,
  } as unknown as Loaded;
}

describe("the candidate profile shows the shared profile (D508)", () => {
  it("keeps the candidate row while there is no shared profile", () => {
    const view = presentProfile(loaded(null));
    expect(view).toMatchObject({
      fullName: "Old Name",
      country: "PL",
      city: "Warsaw",
      timezone: "Europe/Warsaw",
      languages: [{ lang: "en", level: "C1" }],
    });
  });

  it("shows name, place and languages from the shared profile", () => {
    const view = presentProfile(
      loaded({
        userId: "u1",
        displayName: "Anna",
        country: "DE",
        city: "Berlin",
        timezone: "Europe/Berlin",
        languages: [
          { code: "de", level: "B2" },
          { code: "en", level: null },
        ],
        about: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Loaded["shared"]),
    );
    expect(view).toMatchObject({
      fullName: "Anna",
      country: "DE",
      city: "Berlin",
      timezone: "Europe/Berlin",
      languages: [
        { lang: "de", level: "B2" },
        { lang: "en", level: "C1" },
      ],
    });
  });

  it("reads the name and zone from the shared profile in every other place", () => {
    const read = (path: string) =>
      readFileSync(join(process.cwd(), path), "utf8");
    expect(read("src/modules/applications/repo/applications.ts")).toContain(
      "coalesce(${userProfiles.displayName}, ${candidateProfiles.fullName})",
    );
    expect(read("src/modules/candidates/repo/storefront.ts")).toContain(
      "coalesce(${userProfiles.timezone}, ${candidateProfiles.timezone})",
    );
    expect(read("src/modules/admin-console/people-repo.ts")).not.toMatch(
      /[^(]p\.full_name,/,
    );
    expect(read("src/modules/companies/repo/company-repo.ts")).toContain(
      "coalesce(up.display_name, ep.full_name) as full_name",
    );
    for (const path of [
      "src/modules/notifications/service/morning-briefs.ts",
      "src/modules/notifications/service/briefs-admin.ts",
    ])
      expect(read(path)).toContain("coalesce(up.timezone, cp.timezone)");
  });
});
