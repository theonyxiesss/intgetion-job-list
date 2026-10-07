import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { catalogTag } from "@/config/markers";
import { routing } from "@/i18n/routing";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { renderJobFeed } from "@/modules/jobs/service/job-feed";
import { tagSearchOverrides } from "@/modules/jobs/service/tag-query";
import { tagLabel } from "@/modules/seo/tag-label";
import { PRODUCT_NAME } from "@/config/product";

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
  const label = await tagLabel(tag, locale, slug);
  return renderJobFeed(
    jobSearchQuery.parse({ limit: 50, sort: "newest", ...overrides }),
    locale,
    {
      title: `${PRODUCT_NAME}: ${label}`,
      description: label,
      selfPath: `/jobs/t/${slug}/rss.xml`,
      linkPath: `/jobs/t/${slug}`,
    },
  );
}
