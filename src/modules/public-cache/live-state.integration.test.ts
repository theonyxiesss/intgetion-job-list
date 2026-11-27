import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { filterLive, readLiveStates } from "./live-state";

const userId = randomUUID();
const companyId = randomUUID();
const liveId = randomUUID();
const closedId = randomUUID();
const expiredId = randomUUID();
const missingId = randomUUID();
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
    sql`insert into public.users(id,auth_uid,terms_accepted_at,terms_version) values (${userId},${randomUUID()},now(),'live-state-integration')`,
  );
  await db.execute(
    sql`insert into public.companies(id,name,slug,status,created_by) values (${companyId},'Live State Test',${`live-state-${companyId.slice(0, 8)}`},'verified',${userId})`,
  );
  await db.execute(sql`insert into public.jobs(id,company_id,title,description,category,work_format,employment_type,application_method,status,published_at,expires_at) values
    (${liveId},${companyId},'Live state live',${description},'engineering','remote','full_time','internal','published',now(),now()+interval '30 days'),
    (${closedId},${companyId},'Live state closed',${description},'engineering','remote','full_time','internal','closed',now(),now()+interval '30 days'),
    (${expiredId},${companyId},'Live state expired',${description},'engineering','remote','full_time','internal','published',now()-interval '2 days',now()-interval '1 day')`);
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from public.companies where id=${companyId}`,
  );
  await getDb().execute(sql`delete from public.users where id=${userId}`);
});

describe("live state database integration", () => {
  it("keeps only the live job, in order, dropping closed, expired and missing", async () => {
    const items = [
      { id: liveId },
      { id: closedId },
      { id: expiredId },
      { id: missingId },
    ];
    expect(await filterLive(items)).toEqual([{ id: liveId }]);
  });

  it("returns an empty map for an empty id list", async () => {
    expect((await readLiveStates([])).size).toBe(0);
  });
});
