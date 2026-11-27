import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { getDb } from "@/db/client";
import { getJobForPublic, searchJobs } from "@/modules/jobs/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";

// unstable_cache needs the Next runtime; pass through but force a JSON round trip,
// exactly what the persistent cache does to stored values.
vi.mock("next/cache", () => ({
  unstable_cache:
    <T>(fn: () => Promise<T>) =>
    async () =>
      JSON.parse(JSON.stringify(await fn())) as T,
}));

import { cachedJobForPublic, cachedPublicSearch } from "./cached-reads";

const userId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const description =
  "Integration test role description long enough for all schema constraints.";

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("Integration tests require a loopback database");
  }
  const db = getDb();
  await db.execute(
    sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${userId},${randomUUID()},now(),'cached-reads-integration')`,
  );
  await db.execute(
    sql`insert into public.companies(id,name,slug,status,created_by) values (${companyId},'Cached Reads Test',${`cached-reads-${companyId.slice(0, 8)}`},'verified',${userId})`,
  );
  await db.execute(
    sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,status,published_at,expires_at) values
    (${jobId},${companyId},'Cached reads role',${description},'engineering','remote','full_time','internal','published',now(),now()+interval '30 days')`,
  );
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from public.companies where id=${companyId}`,
  );
  await getDb().execute(sql`delete from public.users where id=${userId}`);
});

describe("cached reads survive a JSON round trip", () => {
  it("job page value equals the uncached value after JSON", async () => {
    const direct = JSON.parse(
      JSON.stringify(await getJobForPublic(jobId, { locale: "en" })),
    );
    expect(await cachedJobForPublic(jobId, "en")).toEqual(direct);
  });

  it("search result equals the uncached result after JSON", async () => {
    const query = jobSearchQuery.parse({ q: "Cached reads role" });
    const direct = JSON.parse(JSON.stringify(await searchJobs(query, "en")));
    expect(await cachedPublicSearch(query, "en")).toEqual(direct);
  });
});
