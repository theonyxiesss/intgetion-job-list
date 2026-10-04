import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

type Rows = Record<string, unknown>[];

const rows = async (query: ReturnType<typeof sql>): Promise<Rows> =>
  (await getDb().execute(query)) as unknown as Rows;

/**
 * Everything the platform stores about one user (section 17), as plain
 * rows. Bot messages join here when 7A adds them.
 */
export async function readUserData(userId: string) {
  const [
    user,
    profile,
    contacts,
    skills,
    experience,
    languages,
    preferences,
    employerProfile,
    memberships,
    applications,
    savedJobs,
    feedback,
    reports,
    notifications,
    notificationPreferences,
  ] = await Promise.all([
    rows(
      sql`select id, platform_role, status, locale, terms_accepted_at, terms_version, marketing_opt_in, last_active_at, created_at from public.users where id = ${userId}`,
    ),
    rows(
      sql`select * from public.candidate_profiles where user_id = ${userId}`,
    ),
    rows(
      sql`select email, phone, telegram, linkedin_url, website_url, extra, updated_at from public.candidate_contacts where candidate_id = ${userId}`,
    ),
    rows(
      sql`select s.slug, s.name_en, cs.level, cs.years from public.candidate_skills cs join public.skills s on s.id = cs.skill_id where cs.candidate_id = ${userId}`,
    ),
    rows(
      sql`select company_name, title, start_month, end_month, description from public.candidate_experience where candidate_id = ${userId} order by sort`,
    ),
    rows(
      sql`select lang, level from public.candidate_languages where candidate_id = ${userId}`,
    ),
    rows(
      sql`select categories, company_sizes, notes from public.candidate_preferences where user_id = ${userId}`,
    ),
    rows(
      sql`select full_name, title, linkedin_url, created_at from public.employer_profiles where user_id = ${userId}`,
    ),
    rows(
      sql`select c.name as company, m.role, m.created_at from public.company_members m join public.companies c on c.id = m.company_id where m.user_id = ${userId}`,
    ),
    rows(
      sql`select a.id, j.title as job, a.status, a.cover_note, a.created_at, a.updated_at from public.applications a join public.jobs j on j.id = a.job_id where a.candidate_id = ${userId} order by a.created_at`,
    ),
    rows(
      sql`select j.title as job, s.created_at from public.saved_jobs s join public.jobs j on j.id = s.job_id where s.user_id = ${userId}`,
    ),
    rows(
      sql`select job_id, action, reason, created_at from public.user_job_feedback where user_id = ${userId} order by created_at`,
    ),
    rows(
      sql`select entity_type, entity_id, reason, details, status, created_at from public.reports where reporter_id = ${userId}`,
    ),
    rows(
      sql`select type, payload, read_at, created_at from public.notifications where user_id = ${userId} order by created_at`,
    ),
    rows(
      sql`select type, channel, enabled from public.notification_preferences where user_id = ${userId}`,
    ),
  ]);
  return {
    user: user[0] ?? null,
    candidateProfile: profile[0] ?? null,
    contacts: contacts[0] ?? null,
    skills,
    experience,
    languages,
    preferences: preferences[0] ?? null,
    employerProfile: employerProfile[0] ?? null,
    companyMemberships: memberships,
    applications,
    savedJobs,
    jobFeedback: feedback,
    reports,
    notifications,
    notificationPreferences,
  };
}

export async function findUserForDeletion(userId: string) {
  const found = await rows(
    sql`select id, auth_uid, status, platform_role from public.users where id = ${userId}`,
  );
  return (found[0] ?? null) as {
    id: string;
    auth_uid: string;
    status: string;
    platform_role: string;
  } | null;
}

/**
 * D28 in one transaction: the user row stays (applications keep their
 * candidate id) but every personal field and personal table goes. A sole
 * owner's companies are suspended and their open jobs closed.
 */
export async function anonymizeUser(userId: string, now: Date) {
  return getDb().transaction(async (tx) => {
    const at = now.toISOString();
    const updated = await tx.execute(sql`
      update public.users
      set status = 'deleted', deleted_at = ${at}::timestamptz,
          marketing_opt_in = false, last_active_at = null, updated_at = ${at}::timestamptz
      where id = ${userId} and status <> 'deleted'
      returning id
    `);
    if (updated.length === 0) return null;

    // Companies where this user is the only owner (section 17).
    const soleOwned = (await tx.execute(sql`
      select m.company_id from public.company_members m
      where m.user_id = ${userId} and m.role = 'owner'
        and not exists (
          select 1 from public.company_members o
          where o.company_id = m.company_id and o.role = 'owner' and o.user_id <> ${userId})
    `)) as unknown as { company_id: string }[];
    const companyIds = soleOwned.map((row) => row.company_id);
    let closedJobs = 0;
    for (const companyId of companyIds) {
      await tx.execute(sql`
        update public.companies set status = 'suspended', updated_at = ${at}::timestamptz
        where id = ${companyId} and status <> 'suspended'
      `);
      const closed = (await tx.execute(sql`
        with open as (
          select id, status from public.jobs
          where company_id = ${companyId}
            and status in ('draft', 'pending_moderation', 'published', 'paused')
          for update
        ), closed as (
          update public.jobs j set status = 'closed', updated_at = ${at}::timestamptz
          from open where j.id = open.id
          returning j.id, open.status as previous
        )
        insert into public.job_status_history (job_id, from_status, to_status, actor_id, reason)
        select id, previous, 'closed', null, 'owner_account_deleted' from closed
        returning job_id
      `)) as unknown as unknown[];
      closedJobs += closed.length;
    }

    // Applications stay for the employer (D28) without the free-text note.
    await tx.execute(
      sql`update public.applications set cover_note = null where candidate_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.company_members where user_id = ${userId}`,
    );
    // Profile rows cascade to contacts, skills, experience, languages, preferences.
    await tx.execute(
      sql`delete from public.candidate_profiles where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.employer_profiles where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.saved_jobs where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.notifications where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.notification_emails where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.notification_preferences where user_id = ${userId}`,
    );
    await tx.execute(
      sql`delete from public.matching_results where user_id = ${userId}`,
    );
    return { companyIds, closedJobs };
  });
}

/** Deleted users whose auth record may still exist (retry window). */
export async function recentlyDeletedAuthUids(since: Date) {
  return (await rows(sql`
    select auth_uid from public.users
    where status = 'deleted' and deleted_at >= ${since.toISOString()}::timestamptz
  `)) as { auth_uid: string }[];
}

/** Section 17 retention; each count is the number of deleted rows. */
export async function purgeExpired(now: Date) {
  const days = (n: number) =>
    new Date(now.getTime() - n * 24 * 60 * 60 * 1000).toISOString();
  const count = async (query: ReturnType<typeof sql>) =>
    ((await getDb().execute(query)) as unknown as unknown[]).length;
  return {
    jobFeedback: await count(sql`
      delete from public.user_job_feedback where created_at < ${days(365)}::timestamptz returning 1`),
    auditLogs: await count(sql`
      delete from public.audit_logs where created_at < ${days(365)}::timestamptz returning 1`),
    matchingResults: await count(sql`
      delete from public.matching_results where computed_at < ${days(30)}::timestamptz returning 1`),
    readNotifications: await count(sql`
      delete from public.notifications where read_at is not null and read_at < ${days(90)}::timestamptz returning 1`),
  };
}
