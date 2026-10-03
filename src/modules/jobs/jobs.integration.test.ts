import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { rateKey, rateRules, windowStart } from "@/lib/rate-limit";
import type { CurrentUser } from "@/modules/auth/service";
import { createJob, transitionOwnedJob, updateJob } from "./service";

const ownerId = randomUUID();
const outsiderId = randomUUID();
const companyId = randomUUID();
const companySlug = `job-it-${companyId.slice(0, 8)}`;
const jobIds: string[] = [];
const user: CurrentUser = {
  id: ownerId,
  authUid: randomUUID(),
  platformRole: "user",
  status: "active",
  locale: "en",
  termsAcceptedAt: new Date(),
  termsVersion: "test",
  marketingOptIn: false,
  lastActiveAt: null,
  createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
  updatedAt: new Date(),
  deletedAt: null,
};

async function seed() {
  await getDb().execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version, created_at)
    values (${ownerId}, ${user.authUid}, now(), 'integration', ${user.createdAt.toISOString()}),
           (${outsiderId}, ${randomUUID()}, now(), 'integration', now())
  `);
  await getDb().execute(sql`
    insert into public.companies (id, name, slug, domain, status, created_by)
    values (${companyId}, 'Jobs Integration Company', ${companySlug}, 'jobs-integration.example.com', 'verified', ${ownerId})
  `);
  await getDb().execute(
    sql`insert into public.company_members (company_id, user_id, role) values (${companyId}, ${ownerId}, 'owner')`,
  );
}

beforeAll(seed);
afterAll(async () => {
  const db = getDb();
  if (jobIds.length) {
    const ids = sql.join(
      jobIds.map((id) => sql`${id}`),
      sql`, `,
    );
    await db.execute(
      sql`delete from public.moderation_queue where entity_id in (${ids})`,
    );
    await db.execute(sql`delete from public.jobs where id in (${ids})`);
  }
  const bucket = rateRules.jobCreateVerified;
  const key = rateKey("jobCreateVerified", companyId);
  const start = windowStart(new Date(), bucket.windowSeconds);
  await db.execute(
    sql`delete from public.rate_limit_counters where key = ${key} and window_start = ${start.toISOString()}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.execute(
    sql`delete from public.users where id in (${ownerId}, ${outsiderId})`,
  );
});

describe("jobs CRUD and status history in Postgres", () => {
  it("creates, edits, publishes, pauses, extends, closes and records each transition", async () => {
    const input = {
      companyId,
      title: "Integration Test Engineer",
      description:
        "Build and maintain reliable backend services with a collaborative remote team.",
      category: "engineering" as const,
      workFormat: "remote" as const,
      employmentType: "full_time" as const,
      minOverlapHours: 3,
      applicationMethod: "internal" as const,
      skills: [],
      languages: [],
    };
    const created = await createJob(
      user,
      "owner@jobs-integration.example.com",
      input,
    );
    jobIds.push(created.id);
    expect(created.status).toBe("draft");
    const edited = await updateJob(
      created.id,
      { title: "Senior Integration Test Engineer" },
      user,
      "owner@jobs-integration.example.com",
    );
    expect(edited.title).toBe("Senior Integration Test Engineer");
    expect(
      (await transitionOwnedJob(created.id, "publish", ownerId)).status,
    ).toBe("published");
    expect(
      (await transitionOwnedJob(created.id, "pause", ownerId)).status,
    ).toBe("paused");
    expect(
      (await transitionOwnedJob(created.id, "extend", ownerId)).status,
    ).toBe("published");
    expect(
      (await transitionOwnedJob(created.id, "close", ownerId)).status,
    ).toBe("closed");
    const history = await getDb().execute<{ to_status: string }>(
      sql`select to_status from public.job_status_history where job_id = ${created.id} order by created_at`,
    );
    expect(history.map((row) => row.to_status)).toEqual([
      "draft",
      "published",
      "paused",
      "published",
      "closed",
    ]);
  });
});
