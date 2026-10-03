import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { rateKey } from "@/lib/rate-limit";
import {
  CANDIDATE_DTO_KEYS,
  getCandidateForViewer,
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { CONTACTS_DTO_KEYS, saveContacts } from "@/modules/contacts/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  applyToJob,
  expressInterest,
  getOwnApplication,
  patchApplicationStatus,
  readApplicationContacts,
  withdrawOwnApplication,
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
const strangerId = randomUUID();
const candidateId = randomUUID();
const companyId = randomUUID();
const jobIds = [randomUUID(), randomUUID(), randomUUID()];
const userIds = [employerId, memberId, strangerId, candidateId];
const description =
  "Build and maintain reliable backend services with a collaborative remote team.";
const contactEmail = `ada-${candidateId.slice(0, 8)}@example.com`;

async function countReveals(applicationId: string) {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n from public.application_reveals
    where application_id = ${applicationId}
  `);
  return Number(rows[0]?.n ?? 0);
}

async function countReads(applicationId: string) {
  const rows = await getDb().execute<{ n: number }>(sql`
    select count(*)::int as n from public.audit_logs
    where action = 'contacts.read' and entity_id = ${applicationId}
  `);
  return Number(rows[0]?.n ?? 0);
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
  await db.execute(
    sql`delete from public.audit_logs where actor_id in (${sql.join(
      userIds.map((id) => sql`${id}`),
      sql`, `,
    )})`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.delete(users).where(inArray(users.id, userIds));
});

describe("express interest and contact reveal", () => {
  it("reveals atomically, stays idempotent, and closes contacts after a decision", async () => {
    await seedSkills();
    for (const id of userIds) {
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
    await saveContacts(candidateId, {
      email: contactEmail,
      phone: null,
      telegram: null,
      linkedinUrl: null,
      websiteUrl: null,
      extra: {},
    });
    await storeCompleteness(
      candidateId,
      scoreStoredProfile(saved, contactEmail).score,
    );
    await getDb().execute(sql`
      insert into public.companies (id, name, slug, status, created_by)
      values (
        ${companyId},
        'Reveal Integration Co',
        ${`reveal-${companyId.slice(0, 8)}`},
        'verified',
        ${employerId}
      )
    `);
    await getDb().execute(sql`
      insert into public.company_members (company_id, user_id, role)
      values (${companyId}, ${employerId}, 'owner'),
             (${companyId}, ${memberId}, 'member')
    `);
    for (const [index, jobId] of jobIds.entries()) {
      await getDb().execute(sql`
        insert into public.jobs (
          id, company_id, created_by, title, description, category,
          employment_type, application_method, source, status, published_at
        ) values (
          ${jobId}, ${companyId}, ${employerId},
          ${`Reveal role ${index}`}, ${description}, 'engineering',
          'full_time', 'internal', 'internal', 'published', now()
        )
      `);
    }

    const first = await applyToJob(candidateId, {
      jobId: jobIds[0]!,
      coverNote: null,
    });
    await expect(expressInterest(strangerId, first.id)).rejects.toMatchObject({
      status: 404,
    });
    await expect(expressInterest(memberId, first.id)).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
    });
    await expect(
      readApplicationContacts(employerId, first.id),
    ).rejects.toMatchObject({ status: 404 });

    await expect(
      expressInterest(employerId, first.id, {
        beforeReveal: async () => {
          throw new Error("reveal insert failed");
        },
      }),
    ).rejects.toThrow("reveal insert failed");
    expect((await getOwnApplication(candidateId, first.id)).status).toBe(
      "applied",
    );
    expect(await countReveals(first.id)).toBe(0);

    const revealed = await expressInterest(employerId, first.id);
    expect(revealed.status).toBe("shortlisted");
    expect(revealed).not.toHaveProperty("contacts");
    expect(await countReveals(first.id)).toBe(1);
    const again = await expressInterest(employerId, first.id);
    expect(again.status).toBe("shortlisted");
    expect(await countReveals(first.id)).toBe(1);

    const contacts = await readApplicationContacts(employerId, first.id);
    expect(Object.keys(contacts).sort()).toEqual([...CONTACTS_DTO_KEYS].sort());
    expect(contacts.email).toBe(contactEmail);
    expect(await countReads(first.id)).toBe(1);
    await readApplicationContacts(employerId, first.id);
    expect(await countReads(first.id)).toBe(2);
    await expect(
      readApplicationContacts(strangerId, first.id),
    ).rejects.toMatchObject({ status: 404 });
    const profile = await getCandidateForViewer(employerId, candidateId);
    expect(Object.keys(profile).sort()).toEqual([...CANDIDATE_DTO_KEYS].sort());
    expect(profile).not.toHaveProperty("contacts");

    expect(
      (await patchApplicationStatus(employerId, first.id, "rejected")).status,
    ).toBe("rejected");
    await expect(
      readApplicationContacts(employerId, first.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(await countReveals(first.id)).toBe(1);

    const second = await applyToJob(candidateId, {
      jobId: jobIds[1]!,
      coverNote: null,
    });
    await expressInterest(employerId, second.id);
    await withdrawOwnApplication(candidateId, second.id);
    await expect(
      readApplicationContacts(employerId, second.id),
    ).rejects.toMatchObject({ status: 404 });
    expect(await countReveals(second.id)).toBe(1);

    const third = await applyToJob(candidateId, {
      jobId: jobIds[2]!,
      coverNote: null,
    });
    const raced = await Promise.all([
      expressInterest(employerId, third.id),
      expressInterest(employerId, third.id),
    ]);
    expect(raced.map((row) => row.status)).toEqual([
      "shortlisted",
      "shortlisted",
    ]);
    expect(await countReveals(third.id)).toBe(1);
  });
});
