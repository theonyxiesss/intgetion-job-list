import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import type { CurrentUser } from "@/modules/auth/service";
import { exportMyData, runRetention } from "@/modules/privacy/service";
import { conversationHistory } from "./service";

/** D471: the chat text lives 24 hours; the cost counters stay. */
const userId = randomUUID();
const conversationId = randomUUID();
const oldId = randomUUID();
const freshId = randomUUID();
const user = {
  id: userId,
  authUid: randomUUID(),
  platformRole: "user",
} as unknown as CurrentUser;

const rowsOf = async <T>(query: ReturnType<typeof sql>) =>
  (await getDb().execute(query)) as unknown as T[];

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("Chat TTL integration tests require a loopback database");
  }
  const db = getDb();
  await db.execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
    values (${userId}, ${user.authUid}, now(), 'test')
  `);
  await db.execute(sql`
    insert into public.bot_conversations (id, user_id, session_token_hash, locale)
    values (${conversationId}, ${userId}, ${`ttl-${conversationId}`}, 'en')
  `);
  await db.execute(sql`
    insert into public.bot_messages (id, conversation_id, role, content, tool_call, tokens_in, tokens_out, cost_micro_usd, created_at)
    values
      (${oldId}, ${conversationId}, 'user', 'my old plan to move to Lisbon', '{"calls":[]}'::jsonb, 120, 0, 900, now() - interval '30 hours'),
      (${freshId}, ${conversationId}, 'user', 'a fresh question', null, 0, 0, 0, now() - interval '1 hour')
  `);
  await db.execute(sql`
    insert into public.bot_confirmations (conversation_id, user_id, tool, args, args_hash, expires_at, created_at)
    values
      (${conversationId}, ${userId}, 'apply_to_job', '{"coverNote":"old note"}'::jsonb, 'h-old', now() - interval '30 hours', now() - interval '30 hours'),
      (${conversationId}, ${userId}, 'apply_to_job', '{"coverNote":"new note"}'::jsonb, 'h-new', now() + interval '10 minutes', now())
  `);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.bot_conversations where id = ${conversationId}`,
  );
  await db.execute(
    sql`delete from public.audit_logs where actor_id = ${userId}`,
  );
  await db.execute(sql`delete from public.users where id = ${userId}`);
});

describe("chat text lives 24 hours (D471)", () => {
  it("never reads back text older than a day, even before the cron", async () => {
    const history = await conversationHistory(conversationId);
    expect(history.map((message) => message.content)).toEqual([
      "a fresh question",
    ]);
  });

  it("wipes old text and tool arguments but keeps the cost counters", async () => {
    const result = await runRetention(new Date());
    expect(result.chatTextWiped).toBeGreaterThanOrEqual(1);
    expect(result.botConfirmations).toBeGreaterThanOrEqual(1);
    const [old] = await rowsOf<{
      content: string;
      tool_call: unknown;
      tokens_in: number;
      cost_micro_usd: string;
    }>(
      sql`select content, tool_call, tokens_in, cost_micro_usd::text from public.bot_messages where id = ${oldId}`,
    );
    expect(old).toEqual({
      content: "",
      tool_call: null,
      tokens_in: 120,
      cost_micro_usd: "900",
    });
    const [fresh] = await rowsOf<{ content: string }>(
      sql`select content from public.bot_messages where id = ${freshId}`,
    );
    expect(fresh?.content).toBe("a fresh question");
    const confirmations = await rowsOf<{ args_hash: string }>(
      sql`select args_hash from public.bot_confirmations where conversation_id = ${conversationId}`,
    );
    expect(confirmations.map((row) => row.args_hash)).toEqual(["h-new"]);
  });

  it("exports only messages that still have text", async () => {
    const data = await exportMyData(user);
    expect(data.botMessages).toMatchObject([{ content: "a fresh question" }]);
  });
});
