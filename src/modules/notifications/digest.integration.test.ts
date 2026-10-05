import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { runDigestCron, type DigestJobLoader } from "./service";

const userId = randomUUID();
const quietUserId = randomUUID();
// 08:00 in Moscow (UTC+3), far from any other test's clock.
const morning = new Date("2031-03-03T05:00:00Z");
const jobIds = [randomUUID(), randomUUID(), randomUUID()];

// Only our candidate has a feed; every other profile in the database gets
// an empty one, so the run sends nothing to anybody else.
const loadJobs: DigestJobLoader = async (id) =>
  id === userId
    ? [
        {
          jobId: jobIds[0]!,
          title: "Rust engineer",
          companyName: "Acme",
          score: 0.91,
          publishedAt: "2031-03-02T12:00:00Z",
        },
        {
          jobId: jobIds[1]!,
          title: "Go engineer",
          companyName: "Beta",
          score: 0.7,
          publishedAt: "2031-03-02T13:00:00Z",
        },
        {
          jobId: jobIds[2]!,
          title: "Weak match",
          companyName: "Gamma",
          score: 0.6,
          publishedAt: "2031-03-02T14:00:00Z",
        },
      ]
    : [];

beforeAll(async () => {
  const db = getDb();
  for (const [id, locale] of [
    [userId, "ru"],
    [quietUserId, "en"],
  ] as const) {
    await db.insert(users).values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2031-01-01T00:00:00Z"),
      termsVersion: "2026-10-03",
      locale,
    });
    await db.execute(sql`
      insert into public.candidate_profiles (user_id, timezone)
      values (${id}, 'Europe/Moscow')
    `);
  }
  await db.execute(sql`
    insert into public.bot_conversations (user_id, session_token_hash)
    values (${userId}, ${"digest-" + userId})
  `);
});

afterAll(async () => {
  await getDb()
    .delete(users)
    .where(inArray(users.id, [userId, quietUserId]));
});

async function lastDigestAt(id: string): Promise<Date | null> {
  const [row] = await getDb().execute<{ last_digest_at: string | null }>(sql`
    select last_digest_at from public.candidate_profiles where user_id = ${id}
  `);
  return row?.last_digest_at ? new Date(row.last_digest_at) : null;
}

async function digestCount(): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.notifications
    where user_id = ${userId} and type = 'matches.digest'
  `);
  return row?.count ?? 0;
}

describe("digest cron against the database (D185-D188)", () => {
  it("sends one digest: in-app, a queued email and a chat note", async () => {
    await runDigestCron({ now: morning, loadJobs });

    const notifications = await getDb().execute<{
      payload: { matchCount: number; sampleJobIds: string[] };
    }>(sql`
      select payload from public.notifications
      where user_id = ${userId} and type = 'matches.digest'
    `);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]!.payload.matchCount).toBe(2);
    expect(notifications[0]!.payload.sampleJobIds).toEqual([
      jobIds[0],
      jobIds[1],
    ]);

    const emails = await getDb().execute<{
      locale: string;
      status: string;
      payload: { jobs: { jobTitle: string }[] };
    }>(sql`
      select locale, status, payload from public.notification_emails
      where user_id = ${userId} and type = 'matches.digest'
    `);
    expect(emails).toHaveLength(1);
    expect(emails[0]!.locale).toBe("ru");
    expect(emails[0]!.status).toBe("pending");
    expect(emails[0]!.payload.jobs.map((job) => job.jobTitle)).toEqual([
      "Rust engineer — Acme",
      "Go engineer — Beta",
    ]);

    const notes = await getDb().execute<{ content: string }>(sql`
      select m.content from public.bot_messages m
      join public.bot_conversations c on c.id = m.conversation_id
      where c.user_id = ${userId} and m.role = 'system_event'
    `);
    expect(notes).toHaveLength(1);
    expect(notes[0]!.content).toContain("2");

    expect(await lastDigestAt(userId)).toEqual(morning);
    // No new matches: nothing sent and the slot stays free.
    expect(await lastDigestAt(quietUserId)).toBeNull();
  });

  it("never sends a second digest for the same morning", async () => {
    const later = new Date(+morning + 30 * 60 * 1000);
    await runDigestCron({ now: later, loadJobs });
    await Promise.all([
      runDigestCron({ now: later, loadJobs }),
      runDigestCron({ now: later, loadJobs }),
    ]);
    expect(await digestCount()).toBe(1);
  });

  it("skips the next morning when nothing new was published", async () => {
    const nextMorning = new Date(+morning + 24 * 60 * 60 * 1000);
    await runDigestCron({ now: nextMorning, loadJobs });
    expect(await digestCount()).toBe(1);
    expect(await lastDigestAt(userId)).toEqual(morning);
  });
});
