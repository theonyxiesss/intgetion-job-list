import { getTranslations } from "next-intl/server";
import { findSimilarJobs } from "../service";
import { PublicJobCard } from "./public-job-card";

/** "Similar jobs" under a job (D242); nothing when there are none. */
export async function SimilarJobs({
  job,
  locale,
  viewer,
}: {
  job: Parameters<typeof findSimilarJobs>[0];
  locale: string;
  viewer?: Parameters<typeof findSimilarJobs>[2];
}) {
  const jobs = await findSimilarJobs(job, locale, viewer);
  if (jobs.length === 0) return null;
  const t = await getTranslations("jobs");
  return (
    <section aria-labelledby="similar-jobs" className="flex flex-col gap-4">
      <h2 id="similar-jobs" className="t-h3">
        {t("similar")}
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {jobs.map((item) => (
          <li key={item.id}>
            <PublicJobCard job={item} locale={locale} />
          </li>
        ))}
      </ul>
    </section>
  );
}
