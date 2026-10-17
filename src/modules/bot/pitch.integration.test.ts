import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import {
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
  updateCandidateInput,
} from "@/modules/candidates/service";
import { saveContacts } from "@/modules/contacts/service";
import { seedSkills } from "@/modules/taxonomy/service";
import { hashArgs, runTool, toolPreview } from "./service/tools";

/** Spoki's letter for the candidate (D475) against a real database. */
const userId = randomUUID();
const companyId = randomUUID();
const jobId = randomUUID();
const token = userId.slice(0, 8);
const ctx = { userId, conversationId: randomUUID(), locale: "en", state: {} };

const rowsOf = async <T>(query: ReturnType<typeof sql>) =>
  (await getDb().execute(query)) as unknown as T[];

beforeAll(async () => {
  const dbUrl = process.env.DATABASE_URL;
  if (
    !dbUrl ||
    !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      new URL(dbUrl).hostname,
    )
  ) {
    throw new Error("Pitch tests require a loopback database");
  }
  const db = getDb();
  await db.execute(sql`
    insert into public.users (id, auth_uid, terms_accepted_at, terms_version)
    values (${userId}, ${randomUUID()}, now(), 'test')
  `);
  await seedSkills();
  const saved = await saveCandidateProfile(
    userId,
    updateCandidateInput.parse({
      fullName: "Pitch Candidate",
      headline: "Frontend engineer",
      desiredTitles: ["Frontend engineer"],
      timezone: "Europe/Berlin",
      workHoursStart: "09:00",
      workHoursEnd: "18:00",
      workDays: [1, 2, 3, 4, 5],
      workFormats: ["remote"],
      employmentTypes: ["full_time"],
      experienceYears: 4,
      skills: [
        { raw: "TypeScript", level: "advanced" },
        { raw: "React", level: "advanced" },
        { raw: "Python", level: "intermediate" },
      ],
      experience: [],
      languages: [{ lang: "en", level: "C1" }],
    }),
  );
  const email = `pitch-${token}@example.com`;
  await saveContacts(userId, {
    email,
    phone: null,
    telegram: null,
    linkedinUrl: null,
    websiteUrl: null,
    extra: {},
  });
  await storeCompleteness(userId, scoreStoredProfile(saved, email).score);
  await db.execute(sql`
    insert into public.companies (id, name, slug, status)
    values (${companyId}, ${`Pitch Co ${token}`}, ${`pitch-${token}`}, 'verified')
  `);
  await db.execute(sql`
    insert into public.jobs (id, company_id, title, description, category, work_format, employment_type, application_method, status, published_at, expires_at)
    values (${jobId}, ${companyId}, ${`Frontend role ${token}`}, 'Pitch integration role description long enough for the schema constraints.', 'engineering', 'remote', 'full_time', 'internal', 'published', now(), now() + interval '30 days')
  `);
  await db.execute(sql`
    insert into public.job_skills (job_id, skill_id, weight)
    select ${jobId}, id, 2 from public.skills where slug in ('typescript', 'react', 'graphql')
  `);
});

afterAll(async () => {
  const db = getDb();
  await db.execute(
    sql`delete from public.audit_logs where actor_id = ${userId} or entity_id = ${companyId}`,
  );
  await db.execute(sql`delete from public.companies where id = ${companyId}`);
  await db.execute(sql`delete from public.users where id = ${userId}`);
});

describe("Spoki pitch (D475)", () => {
  it("gives only true facts: matching skills, other skills, years", async () => {
    const result = await runTool(ctx, "get_pitch_facts", { jobId });
    expect(result.llm).toContain(`Frontend role ${token}`);
    const facts = JSON.parse(
      result.llm
        .split("\n")[1]!
        .replace(/^<untrusted_data[^>]*>/, "")
        .replace(/<\/untrusted_data>$/, "")
        .replace(/&quot;/g, '"'),
    ) as {
      matchingSkills: string[];
      otherSkills: string[];
      experienceYears: number;
    };
    expect(facts.matchingSkills.sort()).toEqual(["React", "TypeScript"]);
    expect(facts.otherSkills).toEqual(["Python"]);
    expect(facts.experienceYears).toBe(4);
  });

  it("refuses a letter with contacts before the card", async () => {
    await expect(
      toolPreview(ctx, "apply_to_job", {
        jobId,
        coverNote: "I fit well. Mail me at pitch@example.com.",
      }),
    ).rejects.toMatchObject({ code: "COVER_NOTE_CONTACTS" });
  });

  it("names the job on the card and sends exactly the confirmed letter", async () => {
    const args = {
      jobId,
      coverNote:
        "I build frontends in TypeScript and React and have 4 years of experience. I work remotely and keep Berlin hours.",
    };
    expect(await toolPreview(ctx, "apply_to_job", args)).toBe(
      `Frontend role ${token}`,
    );
    await expect(runTool(ctx, "apply_to_job", args)).rejects.toMatchObject({
      status: 422,
    });
    await runTool(ctx, "apply_to_job", args, {
      tool: "apply_to_job",
      userId,
      argsHash: hashArgs("apply_to_job", args),
    });
    const [row] = await rowsOf<{ cover_note: string }>(
      sql`select cover_note from public.applications where candidate_id = ${userId} and job_id = ${jobId}`,
    );
    expect(row?.cover_note).toBe(args.coverNote);
  });
});
