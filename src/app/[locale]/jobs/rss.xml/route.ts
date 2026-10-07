import { getTranslations } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { notFound, toErrorResponse } from "@/lib/http";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import { renderJobFeed } from "@/modules/jobs/service/job-feed";

/** RSS of the newest published jobs (D204, MARKERS.md 7a). Guest view. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ locale: string }> },
) {
  try {
    const { locale } = await context.params;
    if (!hasLocale(routing.locales, locale)) throw notFound();
    const t = await getTranslations({ locale, namespace: "rss" });
    return renderJobFeed(
      jobSearchQuery.parse({ sort: "newest", limit: 50 }),
      locale,
      { title: t("title"), description: t("description") },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
