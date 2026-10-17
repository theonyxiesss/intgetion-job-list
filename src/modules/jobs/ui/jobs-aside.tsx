import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { RailViewer } from "@/components/shell/rail-items";

const card = "flex flex-col gap-3 rounded-lg border border-line p-5";
const textLink =
  "t-body-s self-start text-fg-muted underline-offset-4 hover:text-fg hover:underline";

/**
 * Right column of the catalog (D477): Spoki, saved-search alerts for a
 * candidate or guest, and posting a job for an employer or guest. All
 * secondary: the page's main action is the search.
 */
export async function JobsAside({ viewer }: { viewer: RailViewer }) {
  const t = await getTranslations("jobs.aside");
  const nav = await getTranslations("nav");
  return (
    <aside className="flex flex-col gap-4 self-stretch">
      <div className="flex flex-col gap-4 lg:sticky lg:top-24">
        <section aria-labelledby="aside-spoki" className={card}>
          <h2 id="aside-spoki" className="t-h3">
            {t("spokiTitle")}
          </h2>
          <p className="t-body-s text-fg-muted">{t("spokiText")}</p>
          <ButtonLink href="/chat" variant="secondary" className="self-start">
            {t("spokiAction")}
          </ButtonLink>
        </section>
        {viewer !== "employer" ? (
          <section aria-labelledby="aside-alerts" className={card}>
            <h2 id="aside-alerts" className="t-h3">
              {t("alertsTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{t("alertsText")}</p>
            {viewer === "candidate" ? (
              <>
                <Link href="/saved-searches" className={textLink}>
                  {t("savedSearches")}
                </Link>
                <Link href="/settings/notifications" className={textLink}>
                  {t("notifications")}
                </Link>
              </>
            ) : (
              <Link href="/login" className={textLink}>
                {t("signIn")}
              </Link>
            )}
          </section>
        ) : null}
        {viewer !== "candidate" ? (
          <section aria-labelledby="aside-hire" className={card}>
            <h2 id="aside-hire" className="t-h3">
              {t("hireTitle")}
            </h2>
            <p className="t-body-s text-fg-muted">{t("hireText")}</p>
            <Link href="/post-job" className={textLink}>
              {nav("postJob")}
            </Link>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
