import { z } from "zod";
import { JOB_CATEGORIES } from "@/config/markers";

export const SKILL_CATEGORIES = JOB_CATEGORIES;

export const skillCategorySchema = z.enum(SKILL_CATEGORIES);
export type SkillCategory = z.infer<typeof skillCategorySchema>;

export const skillSourceSchema = z.enum(["user", "bot", "import"]);
export type SkillSource = z.infer<typeof skillSourceSchema>;

/** `pg_trgm` similarity cutoff from section 11.1. One candidate, or a suggestion. */
export const SKILL_SIMILARITY_THRESHOLD = 0.85;
