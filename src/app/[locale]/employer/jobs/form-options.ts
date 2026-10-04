import { getTranslations } from "next-intl/server";
import {
  EMPLOYMENT_TYPES,
  JOB_CATEGORIES,
  PERKS,
  SECTOR_GROUPS,
  SECTORS,
  SENIORITY_LEVELS,
} from "@/config/markers";
import type { JobFormOptions } from "@/modules/jobs/ui/job-form";

/** Translated enum labels for the job form selects. */
export async function jobFormOptions(): Promise<JobFormOptions> {
  const categories = await getTranslations("categories");
  const jobs = await getTranslations("jobs");
  const markers = await getTranslations("markers");
  return {
    categories: Object.fromEntries(
      JOB_CATEGORIES.map((key) => [key, categories(key)]),
    ),
    employment: Object.fromEntries(
      EMPLOYMENT_TYPES.map((key) => [key, jobs(key)]),
    ),
    formats: Object.fromEntries(
      (["remote", "hybrid", "onsite"] as const).map((key) => [key, jobs(key)]),
    ),
    seniority: {
      any: markers("anySeniority"),
      ...Object.fromEntries(
        SENIORITY_LEVELS.map((key) => [key, markers(`seniority.${key}`)]),
      ),
    },
    sectors: Object.fromEntries(
      SECTORS.map((key) => [key, markers(`sectors.${key}`)]),
    ),
    perks: Object.fromEntries(
      PERKS.map((key) => [key, markers(`perks.${key}`)]),
    ),
    groups: Object.fromEntries(
      SECTOR_GROUPS.map((group) => [group.id, markers(`groups.${group.id}`)]),
    ),
  };
}
