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
