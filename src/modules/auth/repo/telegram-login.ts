import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { getDb } from "@/db/client";
import { telegramLoginChallenges } from "@/db/schema";
import type { AppLocale } from "@/i18n/routing";

export type TelegramLoginChallenge =
  typeof telegramLoginChallenges.$inferSelect;

export async function insertTelegramLoginChallenge(input: {
  codeHash: string;
  locale: AppLocale;
  expiresAt: Date;
}): Promise<void> {
  await getDb().insert(telegramLoginChallenges).values(input);
}

export async function deleteExpiredTelegramLogins(now: Date): Promise<void> {
  await getDb()
    .delete(telegramLoginChallenges)
    .where(lt(telegramLoginChallenges.expiresAt, now));
}

export async function findTelegramLoginChallenge(
  codeHash: string,
): Promise<TelegramLoginChallenge | null> {
  const [row] = await getDb()
    .select()
    .from(telegramLoginChallenges)
    .where(eq(telegramLoginChallenges.codeHash, codeHash))
    .limit(1);
  return row ?? null;
}

/**
 * Claims the one "tap Sign in" message. Empty username is not a Telegram
 * username: it only means the ask was already sent (D426). Confirm overwrites
 * it with the real username. No new column, so a phone retry does not need a
 * migration.
 */
export async function claimTelegramLoginPrompt(
  codeHash: string,
  now: Date,
): Promise<boolean> {
  const [row] = await getDb()
    .update(telegramLoginChallenges)
    .set({ username: "" })
    .where(
      and(
        eq(telegramLoginChallenges.codeHash, codeHash),
        isNull(telegramLoginChallenges.username),
        isNull(telegramLoginChallenges.confirmedAt),
        gt(telegramLoginChallenges.expiresAt, now),
      ),
    )
    .returning({ id: telegramLoginChallenges.id });
  return row != null;
}

/** Lets a failed send try once more. Does not touch a confirmed challenge. */
export async function releaseTelegramLoginPrompt(
  codeHash: string,
): Promise<void> {
  await getDb()
    .update(telegramLoginChallenges)
    .set({ username: null })
    .where(
      and(
        eq(telegramLoginChallenges.codeHash, codeHash),
        eq(telegramLoginChallenges.username, ""),
        isNull(telegramLoginChallenges.confirmedAt),
      ),
    );
}

/** Marks the challenge confirmed once. A second tap changes nothing. */
export async function confirmTelegramLoginChallenge(
  codeHash: string,
  profile: {
    telegramId: string;
    username: string | null;
    firstName: string | null;
  },
  now: Date,
): Promise<TelegramLoginChallenge | null> {
  const [row] = await getDb()
    .update(telegramLoginChallenges)
    .set({
      telegramId: profile.telegramId,
      username: profile.username,
      firstName: profile.firstName,
      confirmedAt: now,
    })
    .where(
      and(
        eq(telegramLoginChallenges.codeHash, codeHash),
        isNull(telegramLoginChallenges.confirmedAt),
        gt(telegramLoginChallenges.expiresAt, now),
      ),
    )
    .returning();
  return row ?? null;
}

export async function deleteTelegramLoginChallenge(
  codeHash: string,
): Promise<void> {
  await getDb()
    .delete(telegramLoginChallenges)
    .where(eq(telegramLoginChallenges.codeHash, codeHash));
}
