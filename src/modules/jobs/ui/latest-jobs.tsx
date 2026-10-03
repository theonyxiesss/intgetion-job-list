import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { searchJobs } from "../service";

export async function LatestJobs({ locale }: { locale: string }) {
  const t = await getTranslations("home");
  const result = await searchJobs(
    { limit: 10, minOverlap: 3, sort: "newest" },
    locale,
  );
  return result.items.length ? (
    <ul className="grid gap-3">
      {result.items.map((job) => (
        <li className="rounded border p-4" key={job.id}>
          <Link
            className="font-semibold underline"
            href={`/${locale}/jobs/${job.id}`}
          >
            {job.title}
          </Link>
          <p>
            <Link
              className="underline"
              href={`/${locale}/companies/${job.company.slug}`}
            >
              {job.company.name}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  ) : (
    <p>{t("latestEmpty")}</p>
  );
}
