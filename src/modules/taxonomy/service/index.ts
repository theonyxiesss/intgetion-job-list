/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export type { NormalizeSkillResult, SkillCatalogStats } from "../api/dto";
export {
  SKILL_CATEGORIES,
  SKILL_SIMILARITY_THRESHOLD,
  skillCategorySchema,
  skillSourceSchema,
} from "../schemas";
export type { SkillCategory, SkillSource } from "../schemas";
export { normalizeSkillText, toAliasNormalized } from "./normalize-skill-text";
export {
  getSkillCatalogStats,
  normalizeSkill,
  seedSkills,
} from "./taxonomy-service";
