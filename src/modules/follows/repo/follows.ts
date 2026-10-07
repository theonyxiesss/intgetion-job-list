import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { toAppLocale } from "@/i18n/locale";

export type Follow = {
  userId: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  lastAlertAt: Date | null;
  createdAt: Date;
};

type Row = {
  user_id: string;
  company_id: string;
  name: string;
  slug: string;
  last_alert_at: string | Date | null;
  created_at: string | Date;
};

const toFollow = (row: Row): Follow => ({
  userId: row.user_id,
  companyId: row.company_id,
  companyName: row.name,
  companySlug: row.slug,
  lastAlertAt: row.last_alert_at ? new Date(row.last_alert_at) : null,
  createdAt: new Date(row.created_at),
});

export async function follow(userId: string, companyId: string) {
  await getDb().execute(sql`
    insert into public.company_follows (user_id, company_id)
    values (${userId}, ${companyId})
    on conflict do nothing
  `);
}

export async function unfollow(userId: string, companyId: string) {
  await getDb().execute(sql`
    delete from public.company_follows
    where user_id = ${userId} and company_id = ${companyId}
  `);
}

export async function isFollowing(userId: string, companyId: string) {
  const rows = await getDb().execute(sql`
    select 1 from public.company_follows
    where user_id = ${userId} and company_id = ${companyId}
  `);
  return (rows as unknown[]).length > 0;
}

export async function countForUser(userId: string): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.company_follows where user_id = ${userId}
  `);
  return row?.count ?? 0;
}

export async function countFollowers(companyId: string): Promise<number> {
  const [row] = await getDb().execute<{ count: number }>(sql`
    select count(*)::int as count from public.company_follows f
    join public.users u on u.id = f.user_id and u.status = 'active'
    where f.company_id = ${companyId}
  `);
  return row?.count ?? 0;
}

export async function listForUser(userId: string): Promise<Follow[]> {
  const rows = await getDb().execute<Row>(sql`
    select f.*, c.name, c.slug from public.company_follows f
    join public.companies c on c.id = f.company_id
    where f.user_id = ${userId}
    order by c.name
  `);
  return rows.map(toFollow);
}

/** Follows whose daily alert may go out now, with the follower's locale. */
export async function listDue(now: Date) {
  const rows = await getDb().execute<Row & { locale: string }>(sql`
    select f.*, c.name, c.slug, u.locale from public.company_follows f
    join public.companies c on c.id = f.company_id
    join public.users u on u.id = f.user_id
    where u.status = 'active'
      and (f.last_alert_at is null
           or f.last_alert_at < ${now.toISOString()}::timestamptz - interval '20 hours')
    order by f.last_alert_at nulls first
    limit 1000
  `);
  return rows.map((row) => ({
    ...toFollow(row),
    locale: toAppLocale(row.locale),
  }));
}
