import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

export type TelegramAccount = {
  telegramId: number;
  userId: string;
  username: string | null;
};

type Row = { telegram_id: string; user_id: string; username: string | null };

const toAccount = (row: Row): TelegramAccount => ({
  telegramId: Number(row.telegram_id),
  userId: row.user_id,
  username: row.username,
});

export async function findByTelegramId(
  telegramId: number,
): Promise<TelegramAccount | null> {
  const [row] = await getDb().execute<Row>(sql`
    select telegram_id, user_id, username from public.telegram_accounts
    where telegram_id = ${telegramId}
  `);
  return row ? toAccount(row) : null;
}

export async function findByUserId(
  userId: string,
): Promise<TelegramAccount | null> {
  const [row] = await getDb().execute<Row>(sql`
    select telegram_id, user_id, username from public.telegram_accounts
    where user_id = ${userId}
  `);
  return row ? toAccount(row) : null;
}

/**
 * Links a Telegram id to a user. Returns false when that Telegram id or
 * that user is already linked elsewhere; the username is refreshed.
 */
export async function link(
  telegramId: number,
  userId: string,
  username: string | null,
): Promise<boolean> {
  const rows = await getDb()
    .execute(
      sql`
    insert into public.telegram_accounts (telegram_id, user_id, username)
    values (${telegramId}, ${userId}, ${username})
    on conflict (telegram_id) do update set username = excluded.username
      where telegram_accounts.user_id = excluded.user_id
    returning 1
  `,
    )
    .catch((error: { code?: string; cause?: { code?: string } }) => {
      // The user already has another Telegram id (unique user_id).
      if ((error.code ?? error.cause?.code) === "23505") return [];
      throw error;
    });
  return (rows as unknown[]).length > 0;
}

export async function unlink(userId: string): Promise<void> {
  await getDb().execute(sql`
    delete from public.telegram_accounts where user_id = ${userId}
  `);
}
