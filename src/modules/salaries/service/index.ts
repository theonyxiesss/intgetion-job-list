import { cache } from "react";
import {
  findActiveSkill,
  listRecentFxRates,
  listSalarySamples,
  listSkillNames,
  type SkillName,
} from "../repo/salaries-repo";
import { buildSkillStats, type SkillSalaryStats } from "./stats";

export {
  MIN_JOBS_PER_ROW,
  MIN_JOBS_PER_SKILL,
  SENIORITY_ORDER,
  WINDOW_DAYS,
  type SkillSalaryStats,
} from "./stats";
export type { SkillName } from "../repo/salaries-repo";

/** All skills with enough own jobs, with names (D260). Once per render. */
export const getSalaryOverview = cache(
  async function getSalaryOverview(): Promise<
    { stats: SkillSalaryStats; skill: SkillName }[]
  > {
    const now = new Date();
    // One after the other on the pooled connection (D247).
    const samples = await listSalarySamples();
    const rates = await listRecentFxRates();
    const stats = buildSkillStats(samples, rates, now);
    const names = await listSkillNames(stats.map((item) => item.skillSlug));
    const bySlug = new Map(names.map((name) => [name.slug, name]));
    return stats.flatMap((item) => {
      const skill = bySlug.get(item.skillSlug);
      return skill ? [{ stats: item, skill }] : [];
    });
  },
);

/** One skill: null when the skill does not exist; stats null when data is thin. */
export const getSkillSalary = cache(async function getSkillSalary(
  slug: string,
): Promise<{ skill: SkillName; stats: SkillSalaryStats | null } | null> {
  const now = new Date();
  const skill = await findActiveSkill(slug);
  if (!skill) return null;
  const samples = await listSalarySamples();
  const rates = await listRecentFxRates();
  const stats =
    buildSkillStats(
      samples.filter((sample) => sample.skillSlugs.includes(slug)),
      rates,
      now,
    ).find((item) => item.skillSlug === slug) ?? null;
  return { skill, stats };
});

/** Skill slugs that have a salary page worth indexing (sitemap). */
export async function listSalarySkillSlugs(
  now = new Date(),
): Promise<string[]> {
  const samples = await listSalarySamples();
  const rates = await listRecentFxRates();
  return buildSkillStats(samples, rates, now).map((item) => item.skillSlug);
}
