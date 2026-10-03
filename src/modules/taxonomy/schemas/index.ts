import { z } from "zod";

export const SKILL_CATEGORIES = [
  "engineering",
  "data",
  "design",
  "product",
  "marketing",
  "sales",
  "support",
  "operations",
  "finance",
  "hr",
] as const;

export const skillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillSourceSchema = z.enum(["user", "bot", "import"]);
export type SkillSource = z.infer<typeof skillSourceSchema>;

/** `pg_trgm` similarity cutoff from section 11.1. One candidate, or a suggestion. */
export const SKILL_SIMILARITY_THRESHOLD = 0.85;
