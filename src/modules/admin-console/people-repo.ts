import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

type Rows = Record<string, unknown>[];

const rows = async (query: ReturnType<typeof sql>): Promise<Rows> =>
  (await getDb().execute(query)) as unknown as Rows;

export type PeopleCursor = { createdAt: Date; id: string };

export async function listPeople(input: {
  limit: number;
  cursor?: PeopleCursor;
  status?: string;
  role?: "candidate" | "employer" | "both";
  locale?: string;
  id?: string;
  name?: string;
}): Promise<Rows> {
  const cursorAt = input.cursor?.createdAt.toISOString() ?? null;
  const cursorId = input.cursor?.id ?? null;
  return rows(sql`
    select u.id, u.auth_uid, u.status, u.locale, u.created_at, u.last_active_at,
           p.full_name, p.completeness,
           (p.user_id is not null) as candidate,
           exists (
             select 1 from public.company_members m where m.user_id = u.id
           ) as employer,
           ta.username as telegram_username
    from public.users u
    left join public.candidate_profiles p on p.user_id = u.id
    left join public.telegram_accounts ta on ta.user_id = u.id
    where (${input.status ?? null}::text is null or u.status::text = ${input.status ?? null})
      and (${input.locale ?? null}::text is null or u.locale = ${input.locale ?? null})
      and (${input.id ?? null}::uuid is null or u.id = ${input.id ?? null}::uuid)
      and (
        ${input.name ?? null}::text is null
        or p.full_name ilike ${"%" + (input.name ?? "") + "%"}
        or ta.username ilike ${"%" + (input.name ?? "") + "%"}
      )
      and (
        ${input.role ?? null}::text is null
        or (${input.role ?? null} = 'candidate' and p.user_id is not null and not exists (
          select 1 from public.company_members m where m.user_id = u.id
        ))
        or (${input.role ?? null} = 'employer' and exists (
          select 1 from public.company_members m where m.user_id = u.id
        ) and p.user_id is null)
        or (${input.role ?? null} = 'both' and p.user_id is not null and exists (
          select 1 from public.company_members m where m.user_id = u.id
        ))
      )
      and (
        ${cursorAt}::timestamptz is null
        or (u.created_at, u.id) < (${cursorAt}::timestamptz, ${cursorId}::uuid)
      )
    order by u.created_at desc, u.id desc
    limit ${input.limit}
  `);
}

export async function findPerson(id: string): Promise<Rows> {
  return rows(sql`
    select u.id, u.auth_uid, u.status, u.locale, u.platform_role,
           u.created_at, u.last_active_at, u.terms_version, u.marketing_opt_in,
           p.full_name, p.headline, p.completeness, p.is_hidden,
           c.phone, c.telegram as contact_telegram,
           ta.telegram_id::text as telegram_id, ta.username as telegram_username
    from public.users u
    left join public.candidate_profiles p on p.user_id = u.id
    left join public.candidate_contacts c on c.candidate_id = u.id
    left join public.telegram_accounts ta on ta.user_id = u.id
    where u.id = ${id}::uuid
  `);
}

export async function membershipsOf(userId: string): Promise<Rows> {
  return rows(sql`
    select c.id, c.name, c.slug, m.role
    from public.company_members m
    join public.companies c on c.id = m.company_id
    where m.user_id = ${userId}::uuid
    order by c.name
  `);
}

export async function setStatusFrom(
  id: string,
  from: string,
  to: string,
): Promise<boolean> {
  const updated = await rows(sql`
    update public.users
    set status = ${to}::user_status, updated_at = now()
    where id = ${id}::uuid and status::text = ${from}
    returning id
  `);
  return updated.length > 0;
}

export async function insertBlock(
  kind: "email" | "telegram",
  valueHash: string,
  userId: string,
  reason: string,
  createdBy: string,
): Promise<void> {
  await rows(sql`
    insert into public.blocklist (kind, value_hash, user_id, reason, created_by)
    values (${kind}, ${valueHash}, ${userId}::uuid, ${reason}, ${createdBy}::uuid)
    on conflict (kind, value_hash) do nothing
  `);
}

export async function blocklisted(
  kind: "email" | "telegram",
  valueHash: string,
): Promise<boolean> {
  const found = await rows(sql`
    select 1 from public.blocklist
    where kind = ${kind} and value_hash = ${valueHash}
    limit 1
  `);
  return found.length > 0;
}

export async function addNote(input: {
  entityType: "user" | "company";
  entityId: string;
  body: string;
  authorId: string;
}): Promise<Rows> {
  return rows(sql`
    insert into public.admin_notes (entity_type, entity_id, body, author_id)
    values (${input.entityType}, ${input.entityId}::uuid, ${input.body}, ${input.authorId}::uuid)
    returning id, body, author_id, created_at
  `);
}

export async function notesOf(
  entityType: "user" | "company",
  entityId: string,
): Promise<Rows> {
  return rows(sql`
    select n.id, n.body, n.created_at, n.author_id, p.full_name
    from public.admin_notes n
    left join public.candidate_profiles p on p.user_id = n.author_id
    where n.entity_type = ${entityType} and n.entity_id = ${entityId}::uuid
    order by n.created_at
  `);
}

export async function openApproval(
  action: string,
  entityId: string,
): Promise<Rows> {
  return rows(sql`
    select id, action, reason, requested_by, requested_at, expires_at
    from public.admin_approvals
    where action = ${action} and entity_id = ${entityId}::uuid and decided_at is null
    limit 1
  `);
}

export async function insertApproval(input: {
  action: string;
  entityId: string;
  reason: string;
  requestedBy: string;
  expiresAt: string;
}): Promise<Rows> {
  return rows(sql`
    insert into public.admin_approvals
      (action, entity_type, entity_id, reason, requested_by, expires_at)
    values (
      ${input.action}, 'user', ${input.entityId}::uuid, ${input.reason},
      ${input.requestedBy}::uuid, ${input.expiresAt}::timestamptz
    )
    returning id, requested_by, expires_at
  `);
}

export async function findApproval(id: string): Promise<Rows> {
  return rows(sql`
    select id, action, entity_id, reason, requested_by, expires_at, decided_at
    from public.admin_approvals
    where id = ${id}::uuid
  `);
}

export async function decideApproval(
  id: string,
  actorId: string,
  decision: "approved" | "rejected",
): Promise<boolean> {
  const updated = await rows(sql`
    update public.admin_approvals
    set decided_by = ${actorId}::uuid, decided_at = now(), decision = ${decision}
    where id = ${id}::uuid
      and decided_at is null
      and expires_at > now()
      and requested_by <> ${actorId}::uuid
    returning id
  `);
  return updated.length > 0;
}

export async function companyCard(id: string): Promise<Rows> {
  return rows(sql`
    select c.id, c.name, c.slug, c.domain, c.status, c.is_trusted,
           c.description, c.country, c.created_at,
           (select count(*)::int from public.jobs j where j.company_id = c.id) as jobs_total,
           (select count(*)::int from public.jobs j
             where j.company_id = c.id and j.status = 'published') as jobs_published
    from public.companies c
    where c.id = ${id}::uuid
  `);
}

export async function companyMembers(id: string): Promise<Rows> {
  return rows(sql`
    select u.id, m.role, p.full_name
    from public.company_members m
    join public.users u on u.id = m.user_id
    left join public.candidate_profiles p on p.user_id = u.id
    where m.company_id = ${id}::uuid
    order by m.role, p.full_name
  `);
}

export async function jobCard(id: string): Promise<Rows> {
  return rows(sql`
    select j.id, j.title, j.status, j.source, j.category, j.published_at, j.expires_at,
           c.id as company_id, c.name as company_name, c.slug as company_slug,
           (select count(*)::int from public.applications a where a.job_id = j.id) as applications
    from public.jobs j
    join public.companies c on c.id = j.company_id
    where j.id = ${id}::uuid
  `);
}
