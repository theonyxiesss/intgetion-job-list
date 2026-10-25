import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Logo, navFade } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { SCRAPER_TRAP_PATH } from "@/modules/seo/site";
import { footerGroups } from "./footer-groups";
import { LocaleSwitch } from "./locale-switch";

/**
 * Site footer (DESIGN.md 8.11). A phone (max-width 767px) does not show it
 * on any page (D470): the bottom bar and the menu carry its links, and the
 * language switch lives in the menu. The markup stays for search engines.
 */
export function Footer() {
  const t = useTranslations();
  const year = new Date().getUTCFullYear();

  return (
    <footer className="@container mt-auto border-t border-line max-[767px]:hidden">
      <div className="mx-auto grid w-full max-w-[1376px] gap-10 px-4 pt-12 pb-10 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] lg:gap-16 xl:px-12">
        <div className="flex flex-col gap-3">
          <Link
            {...navFade}
            href="/"
            aria-label={t("product.name")}
            className="inline-flex min-h-11 items-center self-start"
          >
            <Logo name={t("product.wordmark")} />
          </Link>
          <p className="t-body-s max-w-[36ch] text-fg-muted">
            {t("home.tagline")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 @3xl:grid-cols-5">
          {footerGroups.map((group) => (
            <nav
              key={group.title}
              aria-label={t(group.title)}
              className="flex min-w-0 flex-col gap-3"
            >
              <p className="t-body-s font-medium text-fg">{t(group.title)}</p>
              <ul className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link
                        {...navFade}
                        href={item.href}
                        className="t-body-s inline-flex min-h-9 items-center break-words text-fg-muted transition-colors hover:text-fg"
                      >
                        {t(item.label)}
                      </Link>
                    ) : (
                      <span className="t-body-s inline-flex min-h-9 items-center break-words text-fg-muted">
                        {t(item.label)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1376px] flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6 xl:px-12">
          <p className="t-caption text-fg-subtle">
            <span className="t-data">© {year}</span> {t("product.name")}.{" "}
            {t("footer.rights")}
          </p>
          <Suspense fallback={null}>
            <LocaleSwitch />
          </Suspense>
          {/* Scraper trap: never rendered, disallowed in robots.txt (D218). */}
          <a href={SCRAPER_TRAP_PATH} hidden rel="nofollow" tabIndex={-1}>
            {t("product.name")}
          </a>
        </div>
      </div>
    </footer>
  );
}
