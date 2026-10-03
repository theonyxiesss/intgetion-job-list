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
import { saveContacts } from "@/modules/contacts/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  applyToJob,
  listEmployerApplications,
  openApplication,
  patchApplicationStatus,
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
const otherCandidateId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const userIds = [
  employerId,
  memberId,
  strangerId,
  candidateId,
  otherCandidateId,
];
const description =
  "Build and maintain reliable backend services with a collaborative remote team.";
const contactEmail = `ada-${candidateId.slice(0, 8)}@example.com`;

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

async function fullProfile(userId: string, email: string, name: string) {
  const input = updateCandidateInput.parse({
    fullName: name,
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
  const saved = await saveCandidateProfile(userId, input);
  await saveContacts(userId, {
    email,
    phone: null,
    telegram: null,
    linkedinUrl: null,
    websiteUrl: null,
    extra: {},
  });
  await storeCompleteness(userId, scoreStoredProfile(saved, email).score);
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

describe("employer application pipeline", () => {
  it("lists only the company's applications, auto-views once, and hides contacts", async () => {
    await seedSkills();
    for (const id of userIds) await makeUser(id);
    await fullProfile(candidateId, contactEmail, "Ada Lovelace");
    await fullProfile(
      otherCandidateId,
      `grace-${otherCandidateId.slice(0, 8)}@example.com`,
      "Grace Hopper",
    );
    await getDb().execute(sql`
      insert into public.companies (id, name, slug, status, created_by)
      values (
        ${companyId},
        'Pipeline Integration Co',
        ${`pipe-${companyId.slice(0, 8)}`},
        'verified',
        ${employerId}
      )
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
        'Pipeline integration role', ${description}, 'engineering',
        'full_time', 'internal', 'internal', 'published', now()
      )
    `);

    const first = await applyToJob(candidateId, { jobId, coverNote: "Hello" });
    const second = await applyToJob(otherCandidateId, {
      jobId,
      coverNote: null,
    });

    await expect(
      listEmployerApplications(strangerId, { jobId }),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const page = await listEmployerApplications(memberId, { jobId, limit: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeTruthy();
    expect(page.items[0]).not.toHaveProperty("contacts");
    const rest = await listEmployerApplications(memberId, {
      jobId,
      cursor: page.nextCursor ?? undefined,
      limit: 1,
    });
    expect(rest.items).toHaveLength(1);
    expect(rest.nextCursor).toBeNull();
    expect([page.items[0]?.id, rest.items[0]?.id].sort()).toEqual(
      [first.id, second.id].sort(),
    );

    const opened = await openApplication(memberId, first.id);
    expect(opened.status).toBe("viewed");
    expect(opened.candidateName).toBe("Ada Lovelace");
    expect(opened).not.toHaveProperty("contacts");
    const again = await openApplication(employerId, first.id);
    expect(again.status).toBe("viewed");
    const viewed = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n
      from public.application_status_history
      where application_id = ${first.id} and to_status = 'viewed'
    `);
    expect(Number(viewed[0]?.n ?? 0)).toBe(1);

    await expect(
      patchApplicationStatus(employerId, first.id, "shortlisted"),
    ).rejects.toMatchObject({
      status: 422,
      code: "EXPRESS_INTEREST_REQUIRED",
    });
    await expect(
      patchApplicationStatus(memberId, first.id, "rejected"),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(openApplication(strangerId, first.id)).rejects.toMatchObject({
      status: 404,
    });

    const profile = await getCandidateForViewer(employerId, candidateId);
    expect(Object.keys(profile).sort()).toEqual([...CANDIDATE_DTO_KEYS].sort());
    expect(profile).not.toHaveProperty("contacts");
    expect(JSON.stringify(profile)).not.toContain(contactEmail);
    await expect(
      getCandidateForViewer(strangerId, candidateId),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    await getDb().execute(sql`
      update public.applications set status = 'shortlisted' where id = ${first.id}
    `);
    expect(
      (await patchApplicationStatus(employerId, first.id, "interview")).status,
    ).toBe("interview");
    expect(
      (await patchApplicationStatus(employerId, first.id, "offer")).status,
    ).toBe("offer");
    expect(
      (await patchApplicationStatus(employerId, first.id, "hired")).status,
    ).toBe("hired");
    expect(
      (await patchApplicationStatus(employerId, second.id, "rejected")).status,
    ).toBe("rejected");
  });
});
