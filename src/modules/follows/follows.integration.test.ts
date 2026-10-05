import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  countFollowers,
  followCompany,
  isFollowing,
  listFollows,
  runCompanyAlerts,
  unfollowCompany,
} from "./service";

const follower = randomUUID();
const owner = randomUUID();
const companyId = randomUUID();
const slug = `follow-${companyId.slice(0, 8)}`;
const morning = new Date("2031-05-01T07:00:00Z");

beforeAll(async () => {
  const db = getDb();
  for (const [id, locale] of [
    [follower, "ru"],
    [owner, "en"],
  ] as const) {
    await db.insert(users).values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2031-01-01T00:00:00Z"),
      termsVersion: "2026-10-03",
      locale,
    });
  }
  await db.execute(sql`
    insert into public.companies (id, name, slug, status, created_by)
    values (${companyId}, 'Follow Co', ${slug}, 'verified', ${owner})
  `);
});

afterAll(async () => {
  await getDb().execute(
    sql`delete from public.companies where id = ${companyId}`,
  );
  await getDb()
    .delete(users)
    .where(inArray(users.id, [follower, owner]));
});

describe("following companies (D239, D240)", () => {
  it("follows by slug once and counts followers", async () => {
    await followCompany(follower, slug);
    await followCompany(follower, slug);
    expect(await isFollowing(follower, companyId)).toBe(true);
    expect(await countFollowers(companyId)).toBe(1);
    expect(
      (await listFollows(follower)).map((follow) => follow.companyName),
    ).toEqual(["Follow Co"]);
  });

  it("refuses an unknown company", async () => {
    await expect(
      followCompany(follower, "no-such-company"),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("sends one alert with the company's new jobs", async () => {
    const jobId = randomUUID();
    await runCompanyAlerts({
      now: morning,
      findJobs: async (follow) =>
        follow.companyId === companyId
          ? [{ id: jobId, title: "Rust engineer" }]
          : [],
    });
    await runCompanyAlerts({
      now: new Date(+morning + 60 * 60 * 1000),
      findJobs: async (follow) =>
        follow.companyId === companyId
          ? [{ id: jobId, title: "Rust engineer" }]
          : [],
    });
    const rows = await getDb().execute<{
      payload: { companySlug: string; matchCount: number };
    }>(sql`
      select payload from public.notifications
      where user_id = ${follower} and type = 'company.new_jobs'
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.payload.companySlug).toBe(slug);
    expect(rows[0]!.payload.matchCount).toBe(1);
  });

  it("unfollows", async () => {
    await unfollowCompany(follower, slug);
    expect(await isFollowing(follower, companyId)).toBe(false);
  });
});
