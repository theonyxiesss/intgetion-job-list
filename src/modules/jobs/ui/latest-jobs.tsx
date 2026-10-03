import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/feedback";
import { searchJobs } from "../service";
import { PublicJobCard } from "./public-job-card";

export async function LatestJobs({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  const result = await searchJobs(
    { limit: 6, minOverlap: 3, sort: "newest" },
    locale,
  );
  return result.items.length ? (
    <ul className="grid gap-4 md:grid-cols-2">
      {result.items.map((job) => (
        <li key={job.id}>
          <PublicJobCard job={job} locale={locale} />
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState title={t("latestEmpty")} />
  );
}
