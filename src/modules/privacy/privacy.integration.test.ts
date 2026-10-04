import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { privacyHash } from "@/lib/privacy-hash";
import { readApplicationContacts } from "@/modules/applications/service";
import type { CurrentUser } from "@/modules/auth/service";
import { deleteMyAccount, exportMyData, runRetention } from "./service";

const candidateId = randomUUID();
const employerId = randomUUID();
const adminId = randomUUID();
const employerCompanyId = randomUUID();
const ownCompanyId = randomUUID();
const employerJobId = randomUUID();
const ownJobId = randomUUID();
const applicationId = randomUUID();
const token = candidateId.slice(0, 8);
const contactEmail = `p13-${token}@example.com`;
const description =
  "Privacy integration role description long enough for the schema constraints.";
const asUser = (id: string, role = "user") =>
  ({ id, authUid: randomUUID(), platformRole: role }) as unknown as CurrentUser;
const candidate = asUser(candidateId);

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("10C integration tests require a loopback database");
  }
  const db = getDb();
  await db.execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version, platform_role)
    values (${candidateId}, ${randomUUID()}, now(), 'test', 'user'),
           (${employerId}, ${randomUUID()}, now(), 'test', 'user'),
           (${adminId}, ${randomUUID()}, now(), 'test', 'admin')
  `);
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${employerCompanyId}, ${`Employer ${token}`}, ${`p-emp-${token}`}, 'verified'),
           (${ownCompanyId}, ${`Own ${token}`}, ${`p-own-${token}`}, 'verified')
  `);
  await db.execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${employerCompanyId}, ${employerId}, 'owner'),
           (${ownCompanyId}, ${candidateId}, 'owner')
  `);
  await db.execute(sql`
    insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
    values (${employerJobId}, ${employerCompanyId}, 'Privacy role', ${description}, 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days'),
           (${ownJobId}, ${ownCompanyId}, 'Own role', ${description}, 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')
  `);
  await db.execute(sql`
    insert into public.candidate_profiles (user_id, full_name, headline, timezone, work_formats, employment_types, work_hours_start, work_hours_end, work_days, desired_titles, min_overlap_hours)
    values (${candidateId}, 'Ada Privacy', 'Backend', 'Europe/Berlin', '{remote}', '{full_time}', '09:00', '18:00', '{1,2,3,4,5}', '{Engineer}', 0)
  `);
  await db.execute(sql`
    insert into public.candidate_contacts (candidate_id, email, phone)
    values (${candidateId}, ${contactEmail}, '+10000000000')
  `);
  await db.execute(sql`
    insert into public.applications (id, job_id, candidate_id, status, cover_note)
    values (${applicationId}, ${employerJobId}, ${candidateId}, 'shortlisted', 'Personal note')
  `);
  await db.execute(sql`
    insert into public.application_reveals (application_id, revealed_by, via)
    values (${applicationId}, ${employerId}, 'shortlisted')
  `);
  await db.execute(
    sql`insert into public.saved_jobs (user_id, job_id) values (${candidateId}, ${employerJobId})`,
  );
  await db.execute(sql`
    with c as (
      insert into public.bot_conversations (user_id, session_token_hash, locale)
      values (${candidateId}, ${`privacy-${token}`}, 'en')
      returning id
    )
    insert into public.bot_messages (conversation_id, role, content)
    select id, 'user', 'find me a job' from c
  `);
  await db.execute(sql`
    insert into public.notifications (user_id, type, payload)
    values (${candidateId}, 'application.viewed', '{}'::jsonb)
  `);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.audit_logs where entity_id in (${candidateId}, ${ownCompanyId}) or actor_id in (${candidateId}, ${employerId})`,
  );
  await db.execute(
    sql`delete from public.companies where id in (${employerCompanyId}, ${ownCompanyId})`,
  );
  await db.execute(
    sql`delete from public.rate_limit_counters where key like ${"%" + privacyHash(candidateId)}`,
  );
  await db.execute(
    sql`delete from public.users where id in (${candidateId}, ${employerId}, ${adminId})`,
  );
});

describe("privacy (10C)", () => {
  it("exports everything about the user, contacts included", async () => {
    const data = await exportMyData(candidate);
    expect(data.exportVersion).toBe(1);
    expect(data.contacts).toMatchObject({ email: contactEmail });
    expect(data.applications).toHaveLength(1);
    expect(data.savedJobs).toHaveLength(1);
    expect(data.notifications).toHaveLength(1);
    expect(data.companyMemberships).toHaveLength(1);
    expect(data.botMessages).toMatchObject([
      { role: "user", content: "find me a job" },
    ]);
  });

  it("limits exports per day", async () => {
    for (let i = 0; i < 4; i += 1) await exportMyData(candidate);
    await expect(exportMyData(candidate)).rejects.toMatchObject({
      status: 429,
    });
  });

  it("refuses to delete an admin account", async () => {
    await expect(
      deleteMyAccount(asUser(adminId, "admin"), null),
    ).rejects.toMatchObject({ status: 422, code: "ADMIN_PROTECTED" });
  });

  it("P13: deletion anonymises the user and closes contacts", async () => {
    // Before: the employer reads the candidate's contacts.
    await expect(
      readApplicationContacts(employerId, applicationId),
    ).resolves.toMatchObject({ email: contactEmail });

    const result = await deleteMyAccount(candidate, "203.0.113.1");
    expect(result.deleted).toBe(true);

    const db = getDb();
    const [user] = (await db.execute(
      sql`select status, deleted_at, marketing_opt_in from public.users where id = ${candidateId}`,
    )) as unknown as { status: string; deleted_at: string | null }[];
    expect(user?.status).toBe("deleted");
    expect(user?.deleted_at).not.toBeNull();

    const count = async (table: string, column = "user_id") =>
      (
        (await db.execute(
          sql.raw(
            `select 1 from public.${table} where ${column} = '${candidateId}'`,
          ),
        )) as unknown as unknown[]
      ).length;
    expect(await count("candidate_profiles")).toBe(0);
    expect(await count("candidate_contacts", "candidate_id")).toBe(0);
    expect(await count("saved_jobs")).toBe(0);
    expect(await count("notifications")).toBe(0);
    expect(await count("company_members")).toBe(0);
    expect(await count("bot_conversations")).toBe(0);

    const [application] = (await db.execute(
      sql`select status, cover_note from public.applications where id = ${applicationId}`,
    )) as unknown as { status: string; cover_note: string | null }[];
    expect(application).toEqual({ status: "shortlisted", cover_note: null });
    await expect(
      readApplicationContacts(employerId, applicationId),
    ).rejects.toMatchObject({ status: 404 });

    const [company] = (await db.execute(
      sql`select status from public.companies where id = ${ownCompanyId}`,
    )) as unknown as { status: string }[];
    expect(company?.status).toBe("suspended");
    const [job] = (await db.execute(
      sql`select status from public.jobs where id = ${ownJobId}`,
    )) as unknown as { status: string }[];
    expect(job?.status).toBe("closed");
    const history = (await db.execute(sql`
      select from_status, to_status from public.job_status_history
      where job_id = ${ownJobId} and reason = 'owner_account_deleted'
    `)) as unknown as { from_status: string; to_status: string }[];
    expect(history).toEqual([
      { from_status: "published", to_status: "closed" },
    ]);

    await expect(deleteMyAccount(candidate, null)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("retention removes only rows past their term", async () => {
    const db = getDb();
    await db.execute(sql`
      insert into public.user_job_feedback (user_id, job_id, action, created_at)
      values (${employerId}, ${employerJobId}, 'saved', now() - interval '400 days'),
             (${employerId}, ${employerJobId}, 'saved', now() - interval '10 days')
    `);
    await db.execute(sql`
      insert into public.audit_logs (actor_id, action, entity_type, entity_id, created_at)
      values (${employerId}, 'test.old', 'user', ${employerId}, now() - interval '400 days'),
             (${employerId}, 'test.new', 'user', ${employerId}, now())
    `);
    await runRetention(new Date());
    const feedback = (await db.execute(
      sql`select 1 from public.user_job_feedback where user_id = ${employerId}`,
    )) as unknown as unknown[];
    expect(feedback).toHaveLength(1);
    const audit = (await db.execute(
      sql`select action from public.audit_logs where actor_id = ${employerId} and action like 'test.%'`,
    )) as unknown as { action: string }[];
    expect(audit.map((row) => row.action)).toEqual(["test.new"]);
  });
});
