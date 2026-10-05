import {
  normalizeSkillResultSchema,
  skillCatalogStatsSchema,
  type NormalizeSkillResult,
  type SkillCatalogStats,
} from "../api/dto";
import * as skillsRepo from "../repo/skills";
import {
  SKILL_SIMILARITY_THRESHOLD,
  skillSourceSchema,
  type SkillSource,
} from "../schemas";
import { normalizeSkillText } from "./normalize-skill-text";
import { extractSkillIds } from "./extract-skills";

const RAW_TEXT_MAX = 500;

async function lookupSkill(
  raw: string,
): Promise<{ id: string; slug: string } | "empty" | null> {
  const trimmed = raw.trim().slice(0, RAW_TEXT_MAX);
  const normalized = normalizeSkillText(trimmed);
  if (!trimmed || !normalized) return "empty";

  const byAlias = await skillsRepo.findActiveSkillByAlias(normalized);
  if (byAlias) return { id: byAlias.id, slug: byAlias.slug };

  const bySlug = await skillsRepo.findActiveSkillBySlug(normalized);
  if (bySlug) return { id: bySlug.id, slug: bySlug.slug };

  const similar = await skillsRepo.findActiveSkillsBySimilarity(
    normalized,
    SKILL_SIMILARITY_THRESHOLD,
  );
  const only = similar[0];
  if (similar.length === 1 && only) return { id: only.id, slug: only.slug };
  return null;
}

/** Read-only match. Unknown text is not stored (the bot must not write a suggestion). */
export async function matchSkillSlug(raw: string): Promise<string | null> {
  const found = await lookupSkill(raw);
  return found && found !== "empty" ? found.slug : null;
}

export async function normalizeSkill(
  raw: string,
  source: SkillSource = "user",
): Promise<NormalizeSkillResult> {
  const parsedSource = skillSourceSchema.parse(source);
  const found = await lookupSkill(raw);
  if (found === "empty") {
    return normalizeSkillResultSchema.parse({ result: "empty" });
  }
  if (found) {
    return normalizeSkillResultSchema.parse({
      result: "matched",
      skillId: found.id,
      slug: found.slug,
    });
  }
  const trimmed = raw.trim().slice(0, RAW_TEXT_MAX);
  const normalized = normalizeSkillText(trimmed);

  const suggestion = await skillsRepo.insertSkillSuggestion({
    rawText: trimmed,
    normalized,
    source: parsedSource,
  });
  return normalizeSkillResultSchema.parse({
    result: "suggested",
    suggestionId: suggestion.id,
    normalized: suggestion.normalized,
    occurrences: suggestion.occurrences,
  });
}

export async function seedSkills(): Promise<void> {
  await skillsRepo.seedSkillCatalog();
}

export async function getSkillCatalogStats(): Promise<SkillCatalogStats> {
  return skillCatalogStatsSchema.parse(
    await skillsRepo.readSkillCatalogStats(),
  );
}

/**
 * Fills in skills for published jobs that have none (D290). Imported jobs
 * arrive without a skill list, which leaves skill pages, filters and the
 * match score blind. Returns how much was done, so a cron can stop early.
 */
export async function backfillJobSkills(
  batch = 200,
): Promise<{ jobs: number; attached: number }> {
  const pending = await skillsRepo.listJobsWithoutSkills(batch);
  if (pending.length === 0) return { jobs: 0, attached: 0 };
  const aliases = await skillsRepo.listActiveSkillAliases();
  let attached = 0;
  for (const job of pending) {
    const skillIds = extractSkillIds(job.text, aliases);
    if (skillIds.length === 0) continue;
    await skillsRepo.attachJobSkills(job.id, skillIds);
    attached += skillIds.length;
  }
  return { jobs: pending.length, attached };
}
