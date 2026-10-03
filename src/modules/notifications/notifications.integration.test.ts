import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { rateKey } from "@/lib/rate-limit";
import { applyToJob } from "@/modules/applications/service";
import {
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { saveContacts } from "@/modules/contacts/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  dispatchEmails,
  failNextNotify,
  notify,
  runNotificationCron,
  writePreferences,
} from "./service";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (!migrationUrl || !appUrl) {
  throw new Error(
    "Integration tests need DATABASE_MIGRATION_URL and DATABASE_URL.",
  );
}

const employerId = randomUUID();
const memberId = randomUUID();
const candidateId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const userIds = [employerId, memberId, candidateId];
const description =
  "Build and maintain reliable backend services with a collaborative remote team.";

async function makeUser(id: string) {
  await getDb()
    .insert(users)
    .values({
      id,
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2026-10-03T10:00:00.000Z"),
      termsVersion: "2026-10-03",
      locale: "en",
    });
}

async function seed() {
  await seedSkills();
  for (const id of userIds) await makeUser(id);
  const input = updateCandidateInput.parse({
    fullName: "Ada Lovelace",
    headline: "Engineer",
    desiredTitles: ["Backend engineer"],
    timezone: "Europe/Berlin",
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
    workFormats: ["remote"],
    employmentTypes: ["full_time"],
    experienceYears: 5,
    salaryMin: "100",
    salaryCurrency: "EUR",
    salaryPeriod: "year",
    salaryBasis: "gross",
    skills: [
      { raw: "React", level: "advanced" },
      { raw: "TypeScript", level: "advanced" },
      { raw: "Python", level: "intermediate" },
    ],
    experience: [],
    languages: [{ lang: "en", level: "C1" }],
  });
  const saved = await saveCandidateProfile(candidateId, input);
  const email = `ada-${candidateId.slice(0, 8)}@example.com`;
  await saveContacts(candidateId, {
    email,
    phone: null,
    telegram: null,
    linkedinUrl: null,
    websiteUrl: null,
    extra: {},
  });
  await storeCompleteness(candidateId, scoreStoredProfile(saved, email).score);
  await getDb().execute(sql`
    insert into public.companies (id, name, slug, status, created_by)
    values (${companyId}, 'Notify Co', ${`notify-${companyId.slice(0, 8)}`}, 'verified', ${employerId})
  `);
  await getDb().execute(sql`
    insert into public.company_members (company_id, user_id, role)
    values (${companyId}, ${employerId}, 'owner'),
           (${companyId}, ${memberId}, 'member')
  `);
  await getDb().execute(sql`
    insert into public.jobs (
      id, company_id, created_by, title, description, category,
      employment_type, application_method, source, status, published_at
    ) values (
      ${jobId}, ${companyId}, ${employerId},
      'Notify role', ${description}, 'engineering',
      'full_time', 'internal', 'internal', 'published', now()
    )
  `);
}

afterAll(async () => {
  const db = getDb();
  const keys = userIds.map((id) => rateKey("apply", id));
  await db.execute(
    sql`delete from public.rate_limit_counters where key in (${sql.join(
      keys.map((key) => sql`${key}`),
      sql`, `,
    )})`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("notification queue", () => {
  it("notifies recruiter+ and still writes in-app when email is off", async () => {
    await seed();
    await applyToJob(candidateId, { jobId, coverNote: null });
    const rows = await getDb().execute<{ user_id: string; type: string }>(sql`
      select user_id, type from public.notifications
      where type = 'application.created' and payload->>'jobId' = ${jobId}
    `);
    expect(rows.map((row) => row.user_id)).toEqual([employerId]);
    const queued = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.notification_emails
      where user_id = ${employerId} and type = 'application.created' and status = 'pending'
    `);
    expect(Number(queued[0]?.n)).toBe(1);

    await writePreferences(candidateId, [
      { type: "application.status_changed", channel: "email", enabled: false },
    ]);
    await notify("application.status_changed", [candidateId], {
      applicationId: randomUUID(),
      jobId,
      jobTitle: "Notify role",
      status: "rejected",
    });
    const inapp = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.notifications
      where user_id = ${candidateId} and type = 'application.status_changed'
    `);
    const mail = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.notification_emails
      where user_id = ${candidateId} and type = 'application.status_changed'
    `);
    expect(Number(inapp[0]?.n)).toBe(1);
    expect(Number(mail[0]?.n)).toBe(0);
  });

  it("keeps one pending email when two applications land in the same hour", async () => {
    await getDb().execute(sql`
      delete from public.notification_emails
      where user_id = ${employerId} and type = 'application.created'
    `);
    const now = new Date("2026-10-03T15:10:00.000Z");
    const payload = {
      applicationId: randomUUID(),
      jobId,
      jobTitle: "Notify role",
      candidateId,
    };
    await notify(
      "application.created",
      [employerId],
      { ...payload, applicationId: randomUUID() },
      now,
    );
    await notify(
      "application.created",
      [employerId],
      { ...payload, applicationId: randomUUID() },
      new Date("2026-10-03T15:40:00.000Z"),
    );
    const queued = await getDb().execute<{
      payload: { applicationCount: number };
    }>(sql`
      select payload from public.notification_emails
      where user_id = ${employerId} and type = 'application.created' and status = 'pending'
    `);
    expect(queued).toHaveLength(1);
    expect(queued[0]?.payload.applicationCount).toBe(2);
  });

  it("does not send one mail twice and skips when there is no sender", async () => {
    const later = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const due = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.notification_emails
      where status = 'pending' and send_after <= ${later.toISOString()}::timestamptz
    `);
    let calls = 0;
    const sender = {
      async send() {
        calls += 1;
        return "sent" as const;
      },
    };
    await Promise.all([
      dispatchEmails({ now: later, sender }),
      dispatchEmails({ now: later, sender }),
    ]);
    expect(calls).toBe(Number(due[0]?.n ?? 0));
    const pending = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.notification_emails
      where user_id = ${employerId} and status = 'pending'
    `);
    expect(Number(pending[0]?.n)).toBe(0);
  });

  it("fails a row after five sender errors", async () => {
    await notify("job.expiring", [employerId], {
      jobId,
      jobTitle: "Notify role",
      expiresAt: "2026-10-06T00:00:00.000Z",
    });
    const sender = {
      async send(): Promise<"sent"> {
        throw new Error("resend 500");
      },
    };
    let now = new Date();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await dispatchEmails({ now, sender });
      now = new Date(now.getTime() + 60 * 60 * 1000);
    }
    const rows = await getDb().execute<{
      status: string;
      attempts: number;
    }>(sql`
      select status, attempts from public.notification_emails
      where user_id = ${employerId} and type = 'job.expiring'
    `);
    expect(rows[0]?.status).toBe("failed");
    expect(rows[0]?.attempts).toBe(5);
  });

  it("does not roll back the application when notify throws", async () => {
    const otherJob = randomUUID();
    await getDb().execute(sql`
      insert into public.jobs (
        id, company_id, created_by, title, description, category,
        employment_type, application_method, source, status, published_at
      ) values (
        ${otherJob}, ${companyId}, ${employerId},
        'Notify fail role', ${description}, 'engineering',
        'full_time', 'internal', 'internal', 'published', now()
      )
    `);
    failNextNotify(new Error("notify failed"));
    const created = await applyToJob(candidateId, {
      jobId: otherJob,
      coverNote: null,
    });
    const rows = await getDb().execute<{ id: string }>(sql`
      select id from public.applications where id = ${created.id}
    `);
    expect(rows).toHaveLength(1);
  });

  it("deletes only read notifications older than 90 days", async () => {
    await getDb().execute(sql`
      insert into public.notifications (user_id, type, payload, read_at, created_at)
      values
        (${candidateId}, 'job.closed', '{"jobId":"a","jobTitle":"Old"}'::jsonb, now() - interval '91 days', now() - interval '91 days'),
        (${candidateId}, 'job.closed', '{"jobId":"b","jobTitle":"New"}'::jsonb, now() - interval '1 day', now() - interval '1 day'),
        (${candidateId}, 'job.closed', '{"jobId":"c","jobTitle":"Unread"}'::jsonb, null, now() - interval '91 days')
    `);
    await runNotificationCron();
    const titles = await getDb().execute<{ title: string }>(sql`
      select payload->>'jobTitle' as title from public.notifications
      where user_id = ${candidateId} and type = 'job.closed'
    `);
    expect(titles.map((row) => row.title).sort()).toEqual(["New", "Unread"]);
  });
});
