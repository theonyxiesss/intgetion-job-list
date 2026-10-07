import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound, toErrorResponse } from "@/lib/http";
import { formatMoneyDto } from "@/lib/money";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { searchJobs } from "@/modules/jobs/service";
import { buildRss } from "@/modules/jobs/service/rss";
import { intlLocale } from "@/i18n/locale";

const FEED_SIZE = 50;

/** RSS of the newest published jobs (D204, MARKERS.md 7a). Guest view. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  try {
    const { locale } = await context.params;
    if (!hasLocale(routing.locales, locale)) throw notFound();
    const t = await getTranslations({ locale, namespace: "rss" });
    const jobsText = await getTranslations({ locale, namespace: "jobs" });
    const categories = await getTranslations({
      locale,
      namespace: "categories",
    });
    const money = intlLocale(locale);
    const { items } = await searchJobs(
      jobSearchQuery.parse({ sort: "newest", limit: FEED_SIZE }),
      locale,
    );
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
    const xml = buildRss(
      {
        title: t("title"),
        description: t("description"),
        siteUrl,
        locale,
      },
      items.map((job) => ({
        id: job.id,
        title: job.title,
        companyName: job.company.name,
        publishedAt: job.publishedAt,
        salary: job.salaryMin
          ? `${formatMoneyDto(job.salaryMin, money)}${job.salaryMax ? ` – ${formatMoneyDto(job.salaryMax, money)}` : ""} / ${jobsText(job.salaryMin.period)}`
          : null,
        categories: [categories(job.category)],
      })),
    );
    return new Response(xml, {
      headers: {
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
