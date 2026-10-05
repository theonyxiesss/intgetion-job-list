import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { botConfirmations, botConversations, botMessages } from "@/db/schema";

export type ConversationRow = typeof botConversations.$inferSelect;
export type MessageRow = typeof botMessages.$inferSelect;
export type ConfirmationRow = typeof botConfirmations.$inferSelect;

export async function findConversationByToken(
  tokenHash: string,
): Promise<ConversationRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(botConversations)
    .where(eq(botConversations.sessionTokenHash, tokenHash))
    .limit(1);
  return row;
}

export async function createConversation(input: {
  userId: string | null;
  tokenHash: string;
  locale: string;
}): Promise<ConversationRow> {
  const [row] = await getDb()
    .insert(botConversations)
    .values({
      userId: input.userId,
      sessionTokenHash: input.tokenHash,
      locale: input.locale,
    })
    .returning();
  return row!;
}

/** Attaches a guest conversation to a user. Loses if another request already did. */
export async function claimConversation(
  id: string,
  userId: string,
  state: ConversationRow["state"],
): Promise<ConversationRow | undefined> {
  const [row] = await getDb()
    .update(botConversations)
    .set({ userId, state })
    .where(and(eq(botConversations.id, id), isNull(botConversations.userId)))
    .returning();
  return row;
}

/**
 * Clears `needsDraftOffer` only when it is still set, so two requests
 * cannot both create a confirmation card.
 */
export async function takeDraftOfferFlag(
  id: string,
): Promise<ConversationRow | undefined> {
  const [row] = await getDb()
    .update(botConversations)
    .set({
      state: sql`${botConversations.state} || '{"needsDraftOffer":false}'::jsonb`,
    })
    .where(
      and(
        eq(botConversations.id, id),
        sql`${botConversations.state}->>'needsDraftOffer' = 'true'`,
      ),
    )
    .returning();
  return row;
}

export async function updateConversation(
  id: string,
  patch: Partial<Pick<ConversationRow, "state" | "summary" | "locale">>,
  now: Date,
) {
  await getDb()
    .update(botConversations)
    .set({ ...patch, lastMessageAt: now })
    .where(eq(botConversations.id, id));
}

export async function insertMessage(input: {
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system_event";
  content: string;
  toolCall?: unknown;
  tokensIn?: number;
  tokensOut?: number;
  costMicroUsd?: bigint;
}): Promise<MessageRow> {
  const [row] = await getDb()
    .insert(botMessages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      toolCall: input.toolCall ?? null,
      tokensIn: input.tokensIn ?? 0,
      tokensOut: input.tokensOut ?? 0,
      costMicroUsd: input.costMicroUsd ?? BigInt(0),
    })
    .returning();
  return row!;
}

/** Newest `limit` messages, returned oldest first. */
export async function listMessages(
  conversationId: string,
  limit: number,
): Promise<MessageRow[]> {
  const rows = await getDb()
    .select()
    .from(botMessages)
    .where(eq(botMessages.conversationId, conversationId))
    .orderBy(desc(botMessages.createdAt), desc(botMessages.id))
    .limit(limit);
  return rows.reverse();
}

/** Platform-wide LLM spend since `since`, for the circuit breaker (12.5). */
export async function spentSince(since: Date): Promise<bigint> {
  const rows = await getDb().execute<{ total: string | null }>(sql`
    select coalesce(sum(cost_micro_usd), 0)::text as total
    from public.bot_messages
    where cost_micro_usd > 0 and created_at >= ${since.toISOString()}::timestamptz
  `);
  return BigInt(rows[0]?.total ?? "0");
}

/** One user's cost per UTC day from `since`, oldest first (anomaly check). */
export async function userDailyCosts(
  userId: string,
  since: Date,
): Promise<{ day: string; total: bigint }[]> {
  const rows = await getDb().execute<{ day: string; total: string }>(sql`
    select to_char(date_trunc('day', m.created_at at time zone 'UTC'), 'YYYY-MM-DD') as day,
           sum(m.cost_micro_usd)::text as total
    from public.bot_messages m
    join public.bot_conversations c on c.id = m.conversation_id
    where c.user_id = ${userId}
      and m.cost_micro_usd > 0
      and m.created_at >= ${since.toISOString()}::timestamptz
    group by 1
    order by 1
  `);
  return rows.map((row) => ({ day: row.day, total: BigInt(row.total) }));
}

export async function createConfirmation(input: {
  conversationId: string;
  userId: string;
  tool: string;
  args: unknown;
  argsHash: string;
  expiresAt: Date;
}): Promise<ConfirmationRow> {
  const [row] = await getDb()
    .insert(botConfirmations)
    .values(input)
    .returning();
  return row!;
}

/**
 * Takes a confirmation once: it must belong to the user and the
 * conversation, be undecided and not expired. Returns undefined otherwise.
 */
export async function decideConfirmation(input: {
  id: string;
  userId: string;
  conversationId: string;
  accepted: boolean;
  now: Date;
}): Promise<ConfirmationRow | undefined> {
  const [row] = await getDb()
    .update(botConfirmations)
    .set({ decidedAt: input.now, accepted: input.accepted })
    .where(
      and(
        eq(botConfirmations.id, input.id),
        eq(botConfirmations.userId, input.userId),
        eq(botConfirmations.conversationId, input.conversationId),
        isNull(botConfirmations.decidedAt),
        gt(botConfirmations.expiresAt, input.now),
      ),
    )
    .returning();
  return row;
}

/** The user's most recent web conversation, if any (9B system events). */
export async function latestConversationForUser(
  userId: string,
): Promise<ConversationRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(botConversations)
    .where(eq(botConversations.userId, userId))
    .orderBy(desc(botConversations.lastMessageAt))
    .limit(1);
  return row;
}
