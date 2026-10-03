import { getTranslations } from "next-intl/server";
import type { JobFormOptions } from "@/modules/jobs/ui/job-form";

/** Translated enum labels for the job form selects. */
export async function jobFormOptions(): Promise<JobFormOptions> {
  const categories = await getTranslations("categories");
  const jobs = await getTranslations("jobs");
  const categoryKeys = [
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
  return {
    categories: Object.fromEntries(categoryKeys.map((k) => [k, categories(k)])),
    employment: Object.fromEntries(
      (["full_time", "part_time", "contract"] as const).map((k) => [
        k,
        jobs(k),
      ]),
    ),
    formats: Object.fromEntries(
      (["remote", "hybrid", "onsite"] as const).map((k) => [k, jobs(k)]),
    ),
  };
}
