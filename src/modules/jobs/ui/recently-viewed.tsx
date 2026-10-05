import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublicJobsByIds } from "../service";

/**
 * "You viewed" on the unfiltered catalog (D228): the jobs kept in the
 * `recent_jobs` cookie, newest first, only those still published.
 */
export async function RecentlyViewed({
  ids,
  locale,
}: {
  ids: readonly string[];
  locale: string;
}) {
  if (ids.length === 0) return null;
  const found = await listPublicJobsByIds([...ids], locale);
  const byId = new Map(found.map((job) => [job.id, job]));
  const jobs = ids.flatMap((id) => byId.get(id) ?? []);
  if (jobs.length === 0) return null;
  const t = await getTranslations("jobs");
  return (
    <section aria-labelledby="recently-viewed" className="flex flex-col gap-2">
      <h2 id="recently-viewed" className="t-label text-fg-muted">
        {t("recentlyViewed")}
      </h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {jobs.map((job) => (
          <li key={job.id} className="t-body-s">
            <Link href={`/jobs/${job.id}`} className="underline">
              {job.title}
            </Link>{" "}
            <span className="text-fg-muted">— {job.company.name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
