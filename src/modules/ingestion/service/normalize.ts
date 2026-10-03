import type { RawImportedJob } from "../adapters/types";

export type CanonicalSkill = { skillId: string; weight: 1 | 2 | 3 };
export type NormalizedImportedJob = Omit<RawImportedJob, "skills"> & {
  skills: CanonicalSkill[];
  location: string | null;
  workFormat: "remote";
  expired: boolean;
  scam: boolean;
};
export type SkillNormalizer = (
  value: string,
) => Promise<{ result: string; skillId?: string }>;

export async function normalizeImportedJob(
  raw: RawImportedJob,
  normalizeSkill: SkillNormalizer,
  now = new Date(),
  isScam: (text: string) => boolean = () => false,
): Promise<NormalizedImportedJob> {
  const skills: CanonicalSkill[] = [];
  for (const rawSkill of raw.skills) {
    const result = await normalizeSkill(rawSkill);
    if (result.result === "matched" && result.skillId)
      skills.push({ skillId: result.skillId, weight: 2 });
  }
  const categories = new Set([
    "engineering", "data", "design", "product", "marketing", "sales",
    "support", "operations", "finance", "hr",
  ]);
  const category = categories.has(raw.category) ? raw.category : "operations";
  return {
    ...raw,
    companyName: raw.companyName.trim().replace(/\s+/g, " "),
    companyDomain: raw.companyDomain?.trim().toLowerCase() || null,
    title: raw.title.trim().replace(/\s+/g, " "),
    description: raw.description.trim().replace(/\s+/g, " "),
    category,
    location: null,
    workFormat: "remote",
    applyUrl: raw.applyUrl.trim(),
    skills,
    expired: Boolean(raw.expiresAt && Date.parse(raw.expiresAt) < now.getTime()),
    scam: isScam(`${raw.title}\n${raw.description}`),
  };
}
