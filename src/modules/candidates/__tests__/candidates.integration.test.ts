import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDb } from "@/db/client";
import { users, skillSuggestions } from "@/db/schema";
import { HttpError } from "@/lib/http";
import { seedSkills } from "@/modules/taxonomy/service";
import { getOwnContacts, saveContacts } from "@/modules/contacts/service";
import {
  getCandidateForViewer,
  getOwnCandidate,
  hasCandidateProfile,
  saveCandidateProfile,
  scoreStoredProfile,
  storeCompleteness,
  updateCandidateInput,
} from "../service";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;
if (!migrationUrl || !appUrl) {
  throw new Error(
    "Integration tests need DATABASE_MIGRATION_URL and DATABASE_URL.",
  );
}

const suffix = randomUUID().slice(0, 8);
const contactEmail = `ada-${suffix}@example.com`;
const unknownSkill = `zzqprofile${suffix}`;

async function makeUser() {
  const [row] = await getDb()
    .insert(users)
    .values({
      authUid: randomUUID(),
      termsAcceptedAt: new Date("2026-10-03T10:00:00.000Z"),
      termsVersion: "2026-10-03",
      locale: "en",
    })
    .returning({ id: users.id });
  if (!row) throw new Error("user insert failed");
  return row.id;
}

const ids: string[] = [];

beforeAll(async () => {
  await seedSkills();
});

afterAll(async () => {
  if (ids.length > 0) {
    await getDb().delete(users).where(inArray(users.id, ids));
  }
  await getDb()
    .delete(skillSuggestions)
    .where(eq(skillSuggestions.rawText, unknownSkill));
});

describe("candidate profile and contacts", () => {
  it("saves a profile, keeps contacts off the profile, and hides it from someone else", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    ids.push(owner, other);

    expect(await hasCandidateProfile(owner)).toBe(false);
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
        { raw: unknownSkill, level: "novice" },
      ],
      experience: [],
      languages: [{ lang: "en", level: "C1" }],
    });

    const saved = await saveCandidateProfile(owner, input);
    expect(saved.completeness).toBe(90);
    expect(saved.missing).toContain("contact_email");
    expect(saved.unrecognizedSkills).toEqual([unknownSkill]);
    expect(saved.skills.map((skill) => skill.slug).sort()).toEqual([
      "python",
      "react",
      "typescript",
    ]);
    expect(saved).not.toHaveProperty("contacts");
    expect(JSON.stringify(saved)).not.toContain(contactEmail);
    expect(await hasCandidateProfile(owner)).toBe(true);

    const contacts = await saveContacts(owner, {
      email: contactEmail,
      phone: null,
      telegram: null,
      linkedinUrl: null,
      websiteUrl: null,
      extra: {},
    });
    expect(contacts.email).toBe(contactEmail);
    expect(await getOwnContacts(owner)).toMatchObject({ email: contactEmail });
    await storeCompleteness(
      owner,
      scoreStoredProfile(saved, contactEmail).score,
    );

    const visible = await getOwnCandidate(owner);
    expect(visible?.completeness).toBe(100);
    expect(visible?.missing).not.toContain("contact_email");
    expect(visible).not.toHaveProperty("contacts");

    await expect(getCandidateForViewer(other, owner)).rejects.toBeInstanceOf(
      HttpError,
    );
    try {
      await getCandidateForViewer(other, owner);
    } catch (error) {
      expect(error).toMatchObject({ status: 404, code: "NOT_FOUND" });
      expect(JSON.stringify(error)).not.toContain(contactEmail);
    }
  });
});
