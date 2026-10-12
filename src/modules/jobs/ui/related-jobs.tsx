import { getTranslations } from "next-intl/server";
import { findRelatedPublishedJobs } from "../service";
import { PublicJobCard } from "./public-job-card";

/** Other published jobs under this one (D394); nothing when there are none. */
export async function RelatedJobs({
  job,
  locale,
  viewer,
}: {
  job: Parameters<typeof findRelatedPublishedJobs>[0];
  locale: string;
  viewer?: Parameters<typeof findRelatedPublishedJobs>[2];
}) {
  const jobs = await findRelatedPublishedJobs(job, locale, viewer);
  if (jobs.length === 0) return null;
  const t = await getTranslations("jobs");
  return (
    <section aria-labelledby="related-jobs" className="flex flex-col gap-4">
      <h2 id="related-jobs" className="t-h3">
        {t("related")}
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
