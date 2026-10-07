import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { toAppLocale } from "@/i18n/locale";

export type SavedSearch = {
  id: string;
  userId: string;
  name: string;
  query: string;
  alert: boolean;
  lastAlertAt: Date | null;
  createdAt: Date;
};

type Row = {
  id: string;
  user_id: string;
  name: string;
  query: string;
  alert: boolean;
  last_alert_at: string | Date | null;
  created_at: string | Date;
};

const toSearch = (row: Row): SavedSearch => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  query: row.query,
  alert: row.alert,
  lastAlertAt: row.last_alert_at ? new Date(row.last_alert_at) : null,
  createdAt: new Date(row.created_at),
});

export async function listForUser(userId: string): Promise<SavedSearch[]> {
  const rows = await getDb().execute<Row>(sql`
    select * from public.saved_searches where user_id = ${userId}
    order by created_at desc
  `);
  return rows.map(toSearch);
}

export async function countForUser(userId: string): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.saved_searches where user_id = ${userId}
  `);
  return row?.count ?? 0;
}

/** Saving the same query again only renames it. */
export async function upsert(input: {
  userId: string;
  name: string;
  query: string;
}): Promise<SavedSearch> {
  const [row] = await getDb().execute<Row>(sql`
    insert into public.saved_searches (user_id, name, query)
    values (${input.userId}, ${input.name}, ${input.query})
    on conflict (user_id, query) do update set name = excluded.name
    returning *
  `);
  return toSearch(row!);
}

export async function setAlert(
  id: string,
  userId: string,
  alert: boolean,
): Promise<boolean> {
  const rows = await getDb().execute(sql`
    update public.saved_searches set alert = ${alert}
    where id = ${id} and user_id = ${userId}
    returning 1
  `);
  return (rows as unknown[]).length > 0;
}

export async function remove(id: string, userId: string): Promise<boolean> {
  const rows = await getDb().execute(sql`
    delete from public.saved_searches where id = ${id} and user_id = ${userId}
    returning 1
  `);
  return (rows as unknown[]).length > 0;
}

/** Searches whose daily alert may go out now, with the owner's locale. */
export async function listDue(now: Date) {
  const rows = await getDb().execute<Row & { locale: string }>(sql`
    select s.*, u.locale from public.saved_searches s
    join public.users u on u.id = s.user_id
    where s.alert and u.status = 'active'
      and (s.last_alert_at is null
           or s.last_alert_at < ${now.toISOString()}::timestamptz - interval '20 hours')
    order by s.last_alert_at nulls first
    limit 500
  `);
  return rows.map((row) => ({
    ...toSearch(row),
    locale: toAppLocale(row.locale),
  }));
}
