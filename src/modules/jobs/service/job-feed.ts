import { formatMoneyDto } from "@/lib/money";
import { siteUrl } from "@/lib/supabase/env";
import { PRODUCT_NAME } from "@/config/product";
import type { JobSearchQuery } from "../schemas/search";
import { searchJobs } from "./public-search";
import { buildRss, type RssChannel } from "./rss";
import { intlLocale } from "@/i18n/locale";

/** Last 50 published jobs for an RSS channel. No personalization. */
export async function renderJobFeed(
  query: JobSearchQuery,
  locale: string,
  channel: Pick<RssChannel, "title" | "description" | "selfPath">,
) {
  const result = await searchJobs(
    { ...query, limit: 50, cursor: undefined },
    locale,
  );
  const money = intlLocale(locale);
  const xml = buildRss(
    {
      title: channel.title,
      description: channel.description,
      siteUrl: siteUrl(),
      locale,
      selfPath: channel.selfPath,
    },
    result.items.map((job) => ({
      id: job.id,
      title: job.title,
      companyName: job.company.name,
      publishedAt: job.publishedAt,
      salary: job.salaryMin ? formatMoneyDto(job.salaryMin, money) : null,
      categories: job.sectors,
    })),
  );
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, s-maxage=600",
    },
  });
}

export function catalogFeedTitle(locale: string) {
  const word =
    (
      { ru: "вакансии", es: "empleos", "pt-BR": "vagas" } as Record<
        string,
        string
      >
    )[locale] ?? "jobs";
  return `${PRODUCT_NAME}: ${word}`;
}
