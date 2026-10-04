/**
 * 6B DoD against the CI database: feedback loop, hidden_company, the
 * recompute queue on publish, two parallel crons, and the /api/matches
 * time budget (3.4).
 */
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { dismissJobForUser, hideJobForUser } from "@/modules/feedback/service";
import { transitionOwnedJob } from "@/modules/jobs/service";
import { getMatchFeed } from "./feed";
import {
  computeMatches,
  getMatches,
  resetComputeCount,
  runMatchingCron,
  takeComputeCount,
} from "./service";

const userId = randomUUID();
const companyId = randomUUID();
const otherCompanyId = randomUUID();
const skillId = randomUUID();
const firstJobId = randomUUID();
const secondJobId = randomUUID();
const otherCoJobIds = [randomUUID(), randomUUID()];
const queuedJobId = randomUUID();
const description =
  "Integration 6B role description long enough for the jobs table check.";

function requireLoopback(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("6B integration tests require a loopback database");
  }
}

async function insertJob(
  id: string,
  company: string,
  title: string,
  status = "published",
): Promise<void> {
  await getDb().execute(sql`
    insert into public.jobs(
      id, company_id, title, description, category, work_format, employment_type,
      application_method, status, published_at, expires_at,
      salary_min, salary_max, salary_currency, salary_period, salary_basis,
      location_country
    ) values (
      ${id}, ${company}, ${title}, ${description},
      'engineering', 'remote', 'full_time', 'internal',
      ${status}::job_status,
      ${status === "published" ? sql`now()` : sql`null`},
      ${status === "published" ? sql`now() + interval '30 days'` : sql`null`},
      500000, 700000, 'EUR', 'month'::salary_period, 'gross'::salary_basis, 'DE'
    )
  `);
  await getDb().execute(sql`
    insert into public.job_skills(job_id, skill_id, weight, min_level)
    values (${id}, ${skillId}, 2, 'intermediate')
  `);
}

function scoreOf(items: { jobId: string; score: number }[], jobId: string) {
  return items.find((item) => item.jobId === jobId)?.score;
}

beforeAll(async () => {
  requireLoopback();
  const db = getDb();
  await db.execute(sql`
    insert into public.users(id, auth_uid, terms_accepted_at, terms_version)
    values (${userId}, ${randomUUID()}, now(), '6b')
  `);
  await db.execute(sql`
    insert into public.companies(id, name, slug, status, created_by) values
      (${companyId}, '6B Match Co', ${`6b-${companyId.slice(0, 8)}`}, 'verified', ${userId}),
      (${otherCompanyId}, '6B Other Co', ${`6b-o-${otherCompanyId.slice(0, 8)}`}, 'verified', ${userId})
  `);
  await db.execute(sql`
    insert into public.skills(id, slug, name_en, name_ru, category)
    values (${skillId}, ${`6b-${skillId.slice(0, 8)}`}, '6B Skill', '6B Skill', 'engineering')
  `);
  await db.execute(sql`
    insert into public.candidate_profiles(
      user_id, timezone, country, work_formats, employment_types,
      work_hours_start, work_hours_end, work_days, experience_years,
      salary_min, salary_currency, salary_period, salary_basis,
      desired_titles, min_overlap_hours
    ) values (
      ${userId}, 'Europe/Berlin', 'DE', '{remote}', '{full_time}',
      '09:00', '18:00', '{1,2,3,4,5}', 5,
      400000, 'EUR', 'month', 'gross', '{Platform Engineer}', 0
    )
  `);
  await db.execute(sql`
    insert into public.candidate_skills(candidate_id, skill_id, level)
    values (${userId}, ${skillId}, 'advanced')
  `);
  await insertJob(firstJobId, companyId, "Platform Engineer");
  await insertJob(secondJobId, companyId, "Platform Engineer II");
  for (const [index, id] of otherCoJobIds.entries()) {
    await insertJob(id, otherCompanyId, `Platform Engineer ${index + 3}`);
  }
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.companies where id in (${companyId}, ${otherCompanyId})`,
  );
  await db.execute(sql`delete from public.skills where id = ${skillId}`);
  await db.execute(sql`delete from public.users where id = ${userId}`);
});

describe("feedback loop (10.5)", () => {
  it("dismissing a job removes it and lowers the next job of the category", async () => {
    const before = await computeMatches(userId);
    const baseline = scoreOf(before.items, secondJobId);
    expect(baseline).toBeDefined();
    expect(scoreOf(before.items, firstJobId)).toBeDefined();

    await dismissJobForUser(userId, firstJobId, { reason: "role" });

    const after = await getMatches(userId);
    expect(scoreOf(after.items, firstJobId)).toBeUndefined();
    const lowered = scoreOf(after.items, secondJobId);
    expect(lowered).toBeDefined();
    expect(lowered!).toBeLessThan(baseline!);

    const hidden = await getMatchFeed(userId, { tab: "hidden" });
    expect(hidden.items.map((item) => item.job.id)).toContain(firstJobId);
    const all = await getMatchFeed(userId, { tab: "all" });
    expect(all.items.map((item) => item.job.id)).not.toContain(firstJobId);
  });

  it("hidden_company excludes every job of the company", async () => {
    const before = await getMatchFeed(userId, { tab: "all" });
    const beforeIds = before.items.map((item) => item.job.id);
    expect(beforeIds).toEqual(expect.arrayContaining(otherCoJobIds));

    await hideJobForUser(userId, otherCoJobIds[0]!, { scope: "company" });

    const after = await getMatchFeed(userId, { tab: "all" });
    const afterIds = after.items.map((item) => item.job.id);
    for (const id of otherCoJobIds) expect(afterIds).not.toContain(id);
  });

  it("offers a profile hint after three hides for the same reason", async () => {
    await getDb().execute(sql`
      insert into public.user_job_feedback(user_id, job_id, company_id, action, reason)
      select ${userId}, ${secondJobId}, ${companyId}, 'dismissed', 'salary'
      from generate_series(1, 3)
    `);
    const feed = await getMatchFeed(userId, { tab: "all" });
    expect(feed.profileHints).toContain("salary");
    await getDb().execute(sql`
      delete from public.user_job_feedback
      where user_id = ${userId} and job_id = ${secondJobId}
    `);
  });
});

describe("recompute on publish (D161)", () => {
  it("queues a job on approve and the cron adds it to a fresh cache", async () => {
    await getDb().execute(sql`
      delete from public.user_job_feedback where user_id = ${userId}
    `);
    await computeMatches(userId);
    await insertJob(
      queuedJobId,
      companyId,
      "Platform Engineer queued",
      "pending_moderation",
    );

    await transitionOwnedJob(queuedJobId, "approve", userId, "admin");
    const queued = await getDb().execute<{ status: string }>(sql`
      select status from public.matching_jobs where job_id = ${queuedJobId}
    `);
    expect(queued.map((row) => row.status)).toEqual(["pending"]);

    // Two crons at once: the task is claimed and computed exactly once.
    const [left, right] = await Promise.all([
      runMatchingCron(),
      runMatchingCron(),
    ]);
    expect(left.failed + right.failed).toBe(0);
    const done = await getDb().execute<{ status: string; attempts: number }>(
      sql`
        select status, attempts from public.matching_jobs
        where job_id = ${queuedJobId}
      `,
    );
    expect(done).toEqual([{ status: "done", attempts: 1 }]);

    // The cache is still fresh, so this read does not recompute.
    resetComputeCount();
    const list = await getMatches(userId);
    expect(takeComputeCount()).toBe(0);
    expect(list.items.map((item) => item.jobId)).toContain(queuedJobId);
  });
});

describe("GET /api/matches budget (3.4)", () => {
  it("stays under 1500 ms cold and 300 ms p95 from the cache", async () => {
    const coldStart = performance.now();
    await computeMatches(userId);
    await getMatchFeed(userId, { tab: "all" });
    expect(performance.now() - coldStart).toBeLessThan(1500);

    const samples: number[] = [];
    for (let run = 0; run < 20; run += 1) {
      const started = performance.now();
      await getMatchFeed(userId, { tab: "all" });
      samples.push(performance.now() - started);
    }
    samples.sort((left, right) => left - right);
    const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
    expect(p95).toBeLessThan(300);
  });
});
