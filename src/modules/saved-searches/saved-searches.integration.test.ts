import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import {
  SAVED_SEARCH_LIMIT,
  listSavedSearches,
  runSearchAlerts,
  saveSearch,
  type AlertJob,
} from "./service";

const userId = randomUUID();
const morning = new Date("2031-04-01T07:00:00Z");
const jobs: AlertJob[] = [
  { id: randomUUID(), title: "Rust engineer", companyName: "Acme" },
  { id: randomUUID(), title: "Go engineer", companyName: "Beta" },
];

beforeAll(async () => {
  await getDb()
    .insert(users)
    .values({
      id: userId,
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2031-01-01T00:00:00Z"),
      termsVersion: "2026-10-03",
      locale: "ru",
    });
});

afterAll(async () => {
  await getDb().delete(users).where(eq(users.id, userId));
});

async function alertCount(): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.notifications
    where user_id = ${userId} and type = 'search.alert'
  `);
  return row?.count ?? 0;
}

describe("saved searches and alerts (D233, D234)", () => {
  it("saves a search once and caps the number per user", async () => {
    const first = await saveSearch(userId, {
      query: "?q=rust&workFormat=remote&cursor=x",
      name: "Rust, remote",
    });
    const again = await saveSearch(userId, {
      query: "workFormat=remote&q=rust",
      name: "Rust remote jobs",
    });
    expect(again.id).toBe(first.id);
    expect(again.name).toBe("Rust remote jobs");
    for (let index = 1; index < SAVED_SEARCH_LIMIT; index += 1) {
      await saveSearch(userId, {
        query: `q=role${index}`,
        name: `Role ${index}`,
      });
    }
    await expect(
      saveSearch(userId, { query: "q=one-too-many", name: "Too many" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(await listSavedSearches(userId)).toHaveLength(SAVED_SEARCH_LIMIT);
  });

  it("sends one alert with the new jobs, in-app and by email", async () => {
    const [search] = await listSavedSearches(userId).then((list) =>
      list.filter((item) => item.query === "q=rust&workFormat=remote"),
    );
    // Only the Rust search finds jobs; the others stay quiet.
    await runSearchAlerts({
      now: morning,
      findJobs: async (due) => (due.id === search!.id ? jobs : []),
    });
    expect(await alertCount()).toBe(1);
    const [email] = await getDb().execute<{
      locale: string;
      payload: {
        query: string;
        searchName: string;
        jobs: { jobTitle: string }[];
      };
    }>(sql`
      select locale, payload from public.notification_emails
      where user_id = ${userId} and type = 'search.alert'
    `);
    expect(email?.locale).toBe("ru");
    expect(email?.payload.query).toBe("q=rust&workFormat=remote");
    expect(email?.payload.searchName).toBe("Rust remote jobs");
    expect(email?.payload.jobs.map((job) => job.jobTitle)).toEqual([
      "Rust engineer — Acme",
      "Go engineer — Beta",
    ]);
  });

  it("never sends the same search twice within a day", async () => {
    await runSearchAlerts({
      now: new Date(+morning + 60 * 60 * 1000),
      findJobs: async () => jobs,
    });
    // Only the nine quiet searches could fire; the Rust one waits a day.
    const [row] = await getDb().execute<{ count: number }>(sql`
      select count(*)::int as count from public.notifications
      where user_id = ${userId} and type = 'search.alert'
        and payload->>'searchName' = 'Rust remote jobs'
    `);
    expect(row?.count).toBe(1);
  });
});
