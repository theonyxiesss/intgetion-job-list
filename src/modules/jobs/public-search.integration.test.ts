import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { jobSearchQuery } from "./schemas/search";
import { getVisibleCompany, searchJobs } from "./service";

const userId = randomUUID(); const companyId = randomUUID(); const suspendedCompanyId = randomUUID(); const jobId = randomUUID(); const secondJobId = randomUUID(); const hiddenJobId = randomUUID();
const searchToken = companyId.slice(0, 8);
beforeAll(async () => {
  const db = getDb();
  await db.execute(sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${userId},${randomUUID()},now(),'4a-integration')`);
  await db.execute(sql`insert into public.companies(id,name,slug,status,created_by) values (${companyId},'4A Search Test',${`4a-search-${companyId.slice(0,8)}`},'verified',${userId})`);
  await db.execute(sql`insert into public.companies(id,name,slug,status,created_by) values (${suspendedCompanyId},'4A Suspended Test',${`4a-suspended-${suspendedCompanyId.slice(0,8)}`},'suspended',${userId})`);
  await db.execute(sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,status,published_at,expires_at) values
    (${jobId},${companyId},${`Integration search ${searchToken} engineer`},'Integration test role description long enough for all schema constraints and public full-text search.','engineering','remote','full_time','internal','published',now(),now()+interval '30 days'),
    (${secondJobId},${companyId},${`Integration search ${searchToken} engineer two`},'Integration test role description long enough for all schema constraints and public full-text search.','engineering','remote','full_time','internal','published',now()-interval '1 second',now()+interval '30 days'),
    (${hiddenJobId},${suspendedCompanyId},${`Integration search ${searchToken} hidden`},'Integration test role description long enough for all schema constraints and public full-text search.','engineering','remote','full_time','internal','published',now(),now()+interval '30 days')`);
});
afterAll(async () => { await getDb().execute(sql`delete from public.companies where id in (${companyId},${suspendedCompanyId})`); await getDb().execute(sql`delete from public.users where id=${userId}`); });

describe("public search database integration", () => {
  it("finds seeded published rows and emits an opaque next page cursor", async () => {
    const result = await searchJobs(jobSearchQuery.parse({ q: `Integration search ${searchToken} engineer`, limit: 1, sort: "relevance" }));
    expect(result.items.map((job) => job.id)).toContain(jobId);
    expect(result.items).toHaveLength(1);
    expect(result.items.map((job) => job.id)).not.toContain(hiddenJobId);
    expect(result.nextCursor).toBeTruthy();
    expect(result.items[0]).not.toHaveProperty("riskScore");
    expect(await getVisibleCompany(`4a-suspended-${suspendedCompanyId.slice(0,8)}`)).toBeNull();
  });
});
