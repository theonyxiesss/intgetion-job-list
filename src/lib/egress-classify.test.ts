import { describe, expect, it } from "vitest";
import { classifyQuery } from "../../scripts/egress-classify.mjs";

describe("classifyQuery", () => {
  it("labels a job page query", () => {
    const sql =
      'select "id", "title", "description" from "jobs" where ("jobs"."id" = $2 and "jobs"."status" = $3) limit $4';
    expect(classifyQuery(sql)).toBe("job-page");
  });

  it("labels a catalog query", () => {
    const sql =
      'select "id", "title" from "jobs" where "jobs"."status" = $1 order by "jobs"."published_at" desc limit $4';
    expect(classifyQuery(sql)).toBe("catalog");
  });

  it("labels a company query", () => {
    const sql =
      'select "id", "title" from "jobs" where ("jobs"."company_id" = $2 and "jobs"."status" = $3) order by "jobs"."published_at" desc limit $4';
    expect(classifyQuery(sql)).toBe("company");
  });

  it("labels a live-state query", () => {
    const sql =
      'select "id", "status", "expires_at" from "jobs" where "jobs"."id" = $1 limit $2';
    expect(classifyQuery(sql)).toBe("live-state");
  });

  it("labels an import query", () => {
    const sql =
      'select "id", md5("description"), "title" from "jobs" where "jobs"."id" = $1 limit $2';
    expect(classifyQuery(sql)).toBe("import");
  });

  it("labels a matching query", () => {
    const sql =
      'select "job_id", "score" from "matching_results" where "user_id" = $1 order by "jobs"."published_at" desc';
    expect(classifyQuery(sql)).toBe("matching");
  });

  it("falls back to other", () => {
    expect(classifyQuery('select 1 from "notifications" limit $1')).toBe(
      "other",
    );
    expect(classifyQuery("")).toBe("other");
  });
});
