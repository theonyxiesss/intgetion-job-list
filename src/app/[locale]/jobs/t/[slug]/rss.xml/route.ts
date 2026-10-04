import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { catalogTag } from "@/config/markers";
import { routing } from "@/i18n/routing";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { renderJobFeed } from "@/modules/jobs/service/job-feed";
import { tagSearchOverrides } from "@/modules/jobs/service/tag-query";

export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string; slug: string }> },
) {
  const { locale, slug } = await context.params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const tag = catalogTag(slug);
  if (!tag) notFound();
  const overrides = await tagSearchOverrides(tag);
  if (!overrides) notFound();
  return renderJobFeed(
    jobSearchQuery.parse({ limit: 50, sort: "newest", ...overrides }),
    locale,
    {
      title: slug,
      description: slug,
      selfPath: `/jobs/t/${slug}/rss.xml`,
    },
  );
}
