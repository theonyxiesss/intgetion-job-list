import { getDb } from "@/db/client";
import { notFound } from "@/lib/http";
import { normalizeSkill } from "@/modules/taxonomy/service";
import { findContactEmail } from "@/modules/contacts/service";
import type { CandidateDto } from "../api/dto";
import * as profiles from "../repo/profiles";
import type { UpdateCandidateInput } from "../schemas";
import { profileCompleteness, type CompletenessInput } from "./completeness";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function hasCandidateProfile(userId: string): Promise<boolean> {
  return profiles.hasProfile(userId);
}

function completenessInput(
  profile: {
    fullName: string | null;
    headline: string | null;
    desiredTitles: readonly string[];
    timezone: string;
    workHoursStart: string;
    workHoursEnd: string;
    workDays: readonly number[];
    skills: readonly unknown[];
    experienceYears: number | null;
    languages: readonly unknown[];
    salaryMin: {
      amountMinor: string;
      currency: string;
      period: string;
      basis: string;
    } | null;
    salaryMax: {
      amountMinor: string;
      currency: string;
      period: string;
      basis: string;
    } | null;
    workFormats: readonly string[];
    employmentTypes: readonly string[];
  },
  contactEmail: string | null,
): CompletenessInput {
  return {
    fullName: profile.fullName,
    headline: profile.headline,
    desiredTitles: profile.desiredTitles,
    timezone: profile.timezone,
    workHoursStart: profile.workHoursStart,
    workHoursEnd: profile.workHoursEnd,
    workDays: profile.workDays,
    skillCount: profile.skills.length,
    experienceYears: profile.experienceYears,
    languageCount: profile.languages.length,
    salaryMin: profile.salaryMin ? BigInt(profile.salaryMin.amountMinor) : null,
    salaryCurrency:
      profile.salaryMin?.currency ?? profile.salaryMax?.currency ?? null,
    salaryPeriod:
      profile.salaryMin?.period ?? profile.salaryMax?.period ?? null,
    salaryBasis: profile.salaryMin?.basis ?? profile.salaryMax?.basis ?? null,
    workFormats: profile.workFormats,
    employmentTypes: profile.employmentTypes,
    contactEmail,
  };
}

async function toDto(
  userId: string,
  unrecognizedSkills: string[],
  conn?: profiles.AppTx,
): Promise<CandidateDto> {
  const loaded = await profiles.loadProfile(userId, conn);
  if (!loaded) throw notFound();
  const presented = profiles.presentProfile(loaded);
  const email = await findContactEmail(userId);
  const { missing } = profileCompleteness(completenessInput(presented, email));
  return { ...presented, missing, unrecognizedSkills };
}

export async function getOwnCandidate(
  userId: string,
): Promise<CandidateDto | null> {
  if (!(await profiles.hasProfile(userId))) return null;
  return toDto(userId, []);
}

/**
 * Until applications exist (5A), only the owner may read a profile (D24, D56).
 * The DTO never contains a `contacts` key.
 */
export async function getCandidateForViewer(
  viewerId: string,
  candidateId: string,
): Promise<CandidateDto> {
  if (!UUID.test(candidateId) || viewerId !== candidateId) throw notFound();
  const profile = await getOwnCandidate(candidateId);
  if (!profile) throw notFound();
  return profile;
}

export async function saveCandidateProfile(
  userId: string,
  input: UpdateCandidateInput,
): Promise<CandidateDto> {
  const resolved: profiles.ResolvedSkill[] = [];
  const unrecognized: string[] = [];
  const seen = new Set<string>();
  for (const skill of input.skills) {
    const match = await normalizeSkill(skill.raw, "user");
    if (match.result !== "matched") {
      unrecognized.push(skill.raw);
      continue;
    }
    if (seen.has(match.skillId)) continue;
    seen.add(match.skillId);
    resolved.push({
      skillId: match.skillId,
      level: skill.level,
      years: skill.years ?? null,
    });
  }

  const email = await findContactEmail(userId);
  const { score, missing } = profileCompleteness({
    fullName: input.fullName,
    headline: input.headline,
    desiredTitles: input.desiredTitles,
    timezone: input.timezone,
    workHoursStart: input.workHoursStart,
    workHoursEnd: input.workHoursEnd,
    workDays: input.workDays,
    skillCount: resolved.length,
    experienceYears: input.experienceYears,
    languageCount: new Set(input.languages.map((item) => item.lang)).size,
    salaryMin: input.salaryMin === null ? null : BigInt(input.salaryMin),
    salaryCurrency: input.salaryCurrency,
    salaryPeriod: input.salaryPeriod,
    salaryBasis: input.salaryBasis,
    workFormats: input.workFormats,
    employmentTypes: input.employmentTypes,
    contactEmail: email,
  });

  await getDb().transaction(async (tx) => {
    await profiles.saveProfile(userId, input, resolved, score, tx);
  });

  const dto = await toDto(userId, unrecognized);
  return {
    ...dto,
    missing,
    completeness: score,
    unrecognizedSkills: unrecognized,
  };
}

export async function storeCompleteness(
  userId: string,
  score: number,
  tx?: profiles.AppTx,
) {
  await profiles.setCompleteness(userId, score, tx);
}

export function scoreStoredProfile(
  profile: CandidateDto,
  contactEmail: string | null,
) {
  return profileCompleteness(completenessInput(profile, contactEmail));
}
