import { describe, expect, it } from "vitest";
import {
  mapRemotiveJob,
  testDripAllowed,
  withinCreateBudget,
} from "../adapters/remotive";

describe("Remotive drip", () => {
  it("keeps the Remotive page as the apply link and drops a row without one", () => {
    const job = mapRemotiveJob({
      id: 12,
      url: "https://remotive.com/remote-jobs/software-development/role-12",
      title: "Backend Engineer",
      company_name: "North",
      category: "Software Development",
      job_type: "full_time",
      tags: ["TypeScript", 1],
      description: "<p>Build APIs.</p><script>alert(1)</script>",
      salary: "$100k",
    });
    expect(job).toMatchObject({
      externalId: "12",
      category: "engineering",
      employmentType: "full_time",
      skills: ["TypeScript"],
      applyUrl: "https://remotive.com/remote-jobs/software-development/role-12",
    });
    expect(job?.description).toContain("Build APIs.");
    expect(job?.description).toContain("$100k");
    expect(job?.description).not.toContain("script");
    expect(mapRemotiveJob({ id: 1, title: "X", company_name: "Y" })).toBeNull();
  });

  it("refreshes jobs already stored and adds only a few new ones", () => {
    const rows = ["a", "b", "c", "d"].map((externalId) => ({ externalId }));
    expect(withinCreateBudget(rows, new Set(["b"]), 2).map((row) => row.externalId)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("refuses the drip on the public site and on the cloud database", () => {
    const local = {
      IMPORT_TEST_DRIP: "true",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://app@127.0.0.1:54322/postgres",
    };
    expect(testDripAllowed(local)).toBe(true);
    expect(testDripAllowed({ ...local, IMPORT_TEST_DRIP: "false" })).toBe(false);
    expect(
      testDripAllowed({
        ...local,
        NEXT_PUBLIC_SITE_URL: "https://intgetion.com",
      }),
    ).toBe(false);
    expect(
      testDripAllowed({
        ...local,
        DATABASE_URL: "postgresql://app@aws-1-eu-central-1.pooler.supabase.com/postgres",
      }),
    ).toBe(false);
  });
});
