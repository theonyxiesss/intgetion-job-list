import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { runTelegramDispatch } from "./service";

const linked = randomUUID();
const unlinked = randomUUID();
const telegramId = 800_000_000 + Math.floor(Math.random() * 1_000_000);
const sent: { chatId: number; text: string }[] = [];
const sender = async (chatId: number, text: string) => {
  sent.push({ chatId, text });
  return "sent" as const;
};

beforeAll(async () => {
  const db = getDb();
  for (const id of [linked, unlinked]) {
    await db.insert(users).values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2031-01-01T00:00:00Z"),
      termsVersion: "2026-10-03",
      locale: "en",
    });
  }
  await db.execute(sql`
    insert into public.telegram_accounts (telegram_id, user_id)
    values (${telegramId}, ${linked})
  `);
  // The digest goes to Telegram; job.closed is off there by default.
  for (const [user, type, payload] of [
    [linked, "matches.digest", { matchCount: 2, sampleJobIds: [] }],
    [linked, "job.closed", { jobId: randomUUID() }],
    [unlinked, "matches.digest", { matchCount: 1, sampleJobIds: [] }],
  ] as const) {
    await db.execute(sql`
      insert into public.notifications (user_id, type, payload)
      values (${user}, ${type}, ${JSON.stringify(payload)}::jsonb)
    `);
  }
});

afterAll(async () => {
  await getDb()
    .delete(users)
    .where(inArray(users.id, [linked, unlinked]));
});

describe("Telegram dispatch against the database (D237)", () => {
  it("pushes allowed notifications of linked accounts once", async () => {
    await runTelegramDispatch({ sender, siteUrl: "https://intgetion.com" });
    const mine = sent.filter((message) => message.chatId === telegramId);
    expect(mine).toHaveLength(1);
    expect(mine[0]!.text).toContain("https://intgetion.com/en/matches");

    await runTelegramDispatch({ sender, siteUrl: "https://intgetion.com" });
    expect(
      sent.filter((message) => message.chatId === telegramId),
    ).toHaveLength(1);
  });

  it("leaves accounts without Telegram alone", async () => {
    const [row] = await getDb().execute<{ checked: number }>(sql`
      select count(*)::int as checked from public.notifications
      where user_id = ${unlinked} and telegram_checked_at is not null
    `);
    expect(row?.checked).toBe(0);
  });
});
