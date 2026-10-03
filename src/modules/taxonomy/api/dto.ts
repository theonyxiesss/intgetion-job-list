import { z } from "zod";

export const normalizeSkillResultSchema = z.discriminatedUnion("result", [
  z.object({
    result: z.literal("matched"),
    skillId: z.string().min(1),
    slug: z.string().min(1),
  }),
  z.object({
    result: z.literal("suggested"),
    suggestionId: z.string().min(1),
    normalized: z.string().min(1),
    occurrences: z.number().int().positive(),
  }),
  z.object({
    result: z.literal("empty"),
  }),
]);

export type NormalizeSkillResult = z.infer<typeof normalizeSkillResultSchema>;

export const skillCatalogStatsSchema = z.object({
  skills: z.number().int().nonnegative(),
  aliases: z.number().int().nonnegative(),
  minAliases: z.number().int().nonnegative(),
  categories: z.array(z.string()),
});

export type SkillCatalogStats = z.infer<typeof skillCatalogStatsSchema>;
