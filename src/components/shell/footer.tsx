import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Logo, navFade } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { SCRAPER_TRAP_PATH } from "@/modules/seo/site";
import { LocaleSwitch } from "./locale-switch";

/**
 * D333: three short groups, real routes only. There are no About, Contact,
 * help or social pages yet, so the footer does not pretend there are.
 */
const groups = [
  {
    title: "footer.platform",
    links: [
      { href: "/jobs", label: "nav.jobs" },
      { href: "/post-job", label: "nav.postJob" },
      { href: "/pricing", label: "nav.pricing" },
      { href: "/chat", label: "nav.chat" },
    ],
  },
  {
    title: "footer.resources",
    links: [
      { href: "/for-employers", label: "nav.employers" },
      { href: "/salaries", label: "footer.salaries" },
      { href: "/#faq", label: "footer.faq" },
    ],
  },
  {
    title: "footer.legal",
    links: [
      { href: "/terms", label: "legal.terms" },
      { href: "/privacy", label: "legal.privacy" },
      { href: "/privacy#cookie-settings", label: "legal.cookies" },
    ],
  },
] as const;

/** Site footer (DESIGN.md 8.11). */
export function Footer() {
  const t = useTranslations();
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid w-full max-w-[1376px] gap-10 px-4 pt-12 pb-10 md:px-6 md:pt-16 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)] lg:gap-16 xl:px-12">
        <div className="flex flex-col gap-3">
          <Link
            {...navFade}
            href="/"
            aria-label={t("product.name")}
            className="inline-flex min-h-11 items-center self-start"
          >
            <Logo name={t("product.wordmark")} sub={t("product.wordmarkSub")} />
          </Link>
          <p className="t-body-s max-w-[36ch] text-fg-muted">
            {t("home.tagline")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
          {groups.map((group) => (
            <nav
              key={group.title}
              aria-label={t(group.title)}
              className="flex min-w-0 flex-col gap-3"
            >
              <p className="t-label text-fg-subtle">{t(group.title)}</p>
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      {...navFade}
                      href={link.href}
                      className="t-body-s inline-flex min-h-9 items-center break-words text-fg-muted transition-colors hover:text-fg"
                    >
                      {t(link.label)}
                    </Link>
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
