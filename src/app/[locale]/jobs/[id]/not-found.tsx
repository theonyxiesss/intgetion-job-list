import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { buttonClass } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { getClosedJobContext } from "@/modules/jobs/service";
import { SimilarJobs } from "@/modules/jobs/ui/similar-jobs";

/**
 * A job that is gone (D292). The answer stays 404 — the page is over — but
 * instead of a dead end the visitor is offered jobs of the same kind. A job
 * that was never public is not acknowledged at all.
 */
export default async function JobNotFound() {
  const locale = await getLocale();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const id = /\/jobs\/([0-9a-f-]{36})/i.exec(pathname)?.[1] ?? "";
  const closed = id ? await getClosedJobContext(id) : null;
  const t = await getTranslations("jobs");

  return (
    <main className="py-10 md:py-16">
      <Container className="flex flex-col gap-8">
        <PageHeader
          title={closed ? t("closedTitle") : t("missingTitle")}
          intro={closed ? t("closedIntro") : t("missingIntro")}
          actions={
            <Link className={buttonClass("secondary")} href="/jobs">
              {t("browseAll")}
            </Link>
          }
        />
        {closed && (
          <SimilarJobs
            job={{
              id,
              category: closed.category,
              skills: closed.skillIds.map((skillId) => ({ id: skillId })),
            }}
            locale={locale}
          />
        )}
      </Container>
    </main>
  );
}
