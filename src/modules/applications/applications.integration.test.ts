import { randomUUID } from "node:crypto";
import { inArray, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { HttpError } from "@/lib/http";
import { rateKey } from "@/lib/rate-limit";
import { EXPRESS_INTEREST_REQUIRED } from "@/modules/applications/service";
import {
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { saveContacts } from "@/modules/contacts/service";
import { seedSkills } from "@/modules/taxonomy/service";
import {
  applyToJob,
  getOwnApplication,
  listOwnApplications,
  patchApplicationStatus,
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
const candidateId = randomUUID();
const thinId = randomUUID();
const memberId = randomUUID();
const strangerId = randomUUID();
const companyId = randomUUID();
const publishedJobId = randomUUID();
const raceJobId = randomUUID();
const importedJobId = randomUUID();
const userIds = [employerId, candidateId, thinId, memberId, strangerId];
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

async function fullProfile(userId: string, email: string) {
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

async function seed() {
  await seedSkills();
  for (const id of userIds) await makeUser(id);
  await fullProfile(candidateId, `ada-${candidateId.slice(0, 8)}@example.com`);
  const thin = updateCandidateInput.parse({
    fullName: "Thin Profile",
    desiredTitles: ["Helper"],
    timezone: "Europe/Berlin",
    workHoursStart: "09:00",
    workHoursEnd: "18:00",
    workDays: [1, 2, 3, 4, 5],
    workFormats: ["remote"],
    employmentTypes: ["full_time"],
    skills: [],
    experience: [],
    languages: [],
  });
  await saveCandidateProfile(thinId, thin);
  await getDb().execute(sql`
    insert into public.companies (id, name, slug, status, created_by)
    values (
      ${companyId},
      'Applications Integration Co',
      ${`apply-${companyId.slice(0, 8)}`},
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
    ) values
      (
        ${publishedJobId}, ${companyId}, ${employerId},
        'Published integration role', ${description}, 'engineering',
        'full_time', 'internal', 'internal', 'published', now()
      ),
      (
        ${raceJobId}, ${companyId}, ${employerId},
        'Race integration role', ${description}, 'engineering',
        'full_time', 'internal', 'internal', 'published', now()
      )
  `);
  await getDb().execute(sql`
    insert into public.jobs (
      id, company_id, created_by, title, description, category,
      employment_type, application_method, application_url, source, status,
      published_at
    ) values (
      ${importedJobId}, ${companyId}, ${employerId},
      'Imported integration role', ${description}, 'engineering',
      'full_time', 'external_url', 'https://example.com/apply',
      'imported', 'published', now()
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

describe("applications in Postgres", () => {
  it("applies once, loses the race, blocks imported jobs, and allows one reapply", async () => {
    await seed();

    await expect(
      applyToJob(thinId, { jobId: publishedJobId, coverNote: null }),
    ).rejects.toMatchObject({
      status: 422,
      code: "PROFILE_INCOMPLETE",
    });
    const thinKey = rateKey("apply", thinId);
    const thinHits = await getDb().execute<{ n: number }>(sql`
      select count(*)::int as n from public.rate_limit_counters where key = ${thinKey}
    `);
    expect(Number(thinHits[0]?.n ?? 0)).toBe(0);

    const created = await applyToJob(candidateId, {
      jobId: publishedJobId,
      coverNote: "I would like to join.",
    });
    expect(created.status).toBe("applied");
    expect(created.reapplyCount).toBe(0);
    expect(created.jobTitle).toBe("Published integration role");

    const raced = await Promise.allSettled([
      applyToJob(candidateId, { jobId: raceJobId, coverNote: null }),
      applyToJob(candidateId, { jobId: raceJobId, coverNote: null }),
    ]);
    const won = raced.filter((row) => row.status === "fulfilled");
    const lost = raced.filter((row) => row.status === "rejected");
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect((lost[0] as PromiseRejectedResult).reason).toMatchObject({
      status: 409,
      code: "ALREADY_APPLIED",
    });

    await expect(
      applyToJob(candidateId, { jobId: importedJobId, coverNote: null }),
    ).rejects.toMatchObject({
      status: 422,
      code: "EXTERNAL_APPLY",
      details: { externalUrl: "https://example.com/apply" },
    });

    const listed = await listOwnApplications(candidateId);
    expect(listed.map((row) => row.jobId).sort()).toEqual(
      [publishedJobId, raceJobId].sort(),
    );
    expect(await getOwnApplication(candidateId, created.id)).toMatchObject({
      id: created.id,
    });
    await expect(
      getOwnApplication(strangerId, created.id),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    await expect(
      patchApplicationStatus(employerId, created.id, "shortlisted"),
    ).rejects.toMatchObject({
      status: 422,
      code: EXPRESS_INTEREST_REQUIRED,
    });
    await expect(
      patchApplicationStatus(memberId, created.id, "rejected"),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    await expect(
      patchApplicationStatus(strangerId, created.id, "rejected"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

    const withdrawn = await withdrawOwnApplication(candidateId, created.id);
    expect(withdrawn.status).toBe("withdrawn");
    const again = await applyToJob(candidateId, {
      jobId: publishedJobId,
      coverNote: null,
    });
    expect(again.reapplyCount).toBe(1);
    expect(again.status).toBe("applied");
    await withdrawOwnApplication(candidateId, again.id);
    await expect(
      applyToJob(candidateId, { jobId: publishedJobId, coverNote: null }),
    ).rejects.toBeInstanceOf(HttpError);
    await expect(
      applyToJob(candidateId, { jobId: publishedJobId, coverNote: null }),
    ).rejects.toMatchObject({ status: 409, code: "REAPPLY_LIMIT" });
  });
});
