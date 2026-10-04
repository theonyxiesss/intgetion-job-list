import {
  EMPLOYMENT_TYPES,
  inferImportedMarkers,
  JOB_CATEGORIES,
  type EmploymentType,
  type JobCategory,
  type Sector,
  type Seniority,
} from "@/config/markers";
import { resolveTimeZone } from "@/lib/tz-aliases";
import type { RawImportedJob } from "../adapters/types";

export { JOB_CATEGORIES };
export type { EmploymentType, JobCategory };

export type NormalizedImportedJob = Omit<
  RawImportedJob,
  "skills" | "category" | "employmentType" | "timeZone"
> & {
  category: JobCategory;
  employmentType: EmploymentType;
  timeZone: string | null;
  skillIds: string[];
  sectors: Sector[];
  seniority: Seniority | null;
  location: string | null;
  workFormat: "remote";
  expired: boolean;
  scam: boolean;
};

/** Canonical skill id, or null when the text went to skill_suggestions. */
export type SkillResolver = (value: string) => Promise<string | null>;

const squash = (value: string) => value.trim().replace(/\s+/g, " ");

/**
 * 13.2: skills to the catalog (unknown ones are not stored on the job),
 * IANA zone or null, fixed category and employment sets. Salary is not in
 * the fixtures; without one the salary component stays neutral (D4/D5).
 */
export async function normalizeImportedJob(
  raw: RawImportedJob,
  resolveSkill: SkillResolver,
  now: Date,
  isScam: (text: string) => boolean,
): Promise<NormalizedImportedJob> {
  const skillIds: string[] = [];
  for (const skill of raw.skills) {
    const id = await resolveSkill(skill);
    if (id && !skillIds.includes(id)) skillIds.push(id);
  }
  const title = squash(raw.title);
  const description = squash(raw.description);
  const markers = inferImportedMarkers(
    `${title}\n${description}\n${raw.category}`,
  );
  const category = (JOB_CATEGORIES as readonly string[]).includes(raw.category)
    ? (raw.category as JobCategory)
    : (markers.category ?? "operations");
  const employmentType = (EMPLOYMENT_TYPES as readonly string[]).includes(
    raw.employmentType ?? "",
  )
    ? (raw.employmentType as EmploymentType)
    : "full_time";
  const applyUrl = raw.applyUrl.trim();
  return {
    externalId: raw.externalId.trim(),
    companyName: squash(raw.companyName),
    companyDomain: raw.companyDomain?.trim().toLowerCase() || null,
    title,
    description,
    category,
    employmentType,
    timeZone: resolveTimeZone(raw.timeZone),
    skillIds,
    sectors: markers.sectors,
    seniority: markers.seniority,
    applyUrl,
    expiresAt: raw.expiresAt,
    location: null,
    workFormat: "remote",
    expired: Boolean(
      raw.expiresAt && Date.parse(raw.expiresAt) < now.getTime(),
    ),
    // The apply link counts too: link shorteners are a scam signal (13.4).
    scam: isScam(`${title}\n${description}\n${applyUrl}`),
  };
}
