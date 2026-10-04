import { useTranslations } from "next-intl";
import { Logo, navFade } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { LocaleSwitch } from "./locale-switch";

const columns = [
  {
    title: "footer.candidates",
    links: [
      { href: "/jobs", label: "nav.jobs" },
      { href: "/saved-jobs", label: "nav.saved" },
      { href: "/applications", label: "applications.nav" },
      { href: "/profile", label: "profile.nav" },
    ],
  },
  {
    title: "footer.employers",
    links: [
      { href: "/for-employers", label: "nav.employers" },
      { href: "/employer/jobs", label: "footer.employerJobs" },
      { href: "/employer/company", label: "footer.company" },
      { href: "/contacts", label: "footer.contacts" },
    ],
  },
  {
    title: "footer.account",
    links: [{ href: "/settings/notifications", label: "footer.settings" }],
  },
] as const;

/** Site footer (DESIGN.md 8.11). */
export function Footer() {
  const t = useTranslations();
  const year = new Date().getUTCFullYear();

  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid w-full max-w-[1376px] gap-10 px-4 py-16 md:grid-cols-4 md:px-6 xl:px-12">
        <div className="flex flex-col gap-4">
          <Logo name={t("product.wordmark")} sub={t("product.wordmarkSub")} />
          <p className="t-body-s max-w-[32ch] text-fg-muted">
            {t("home.tagline")}
          </p>
        </div>
        {columns.map((column) => (
          <nav
            key={column.title}
            aria-label={t(column.title)}
            className="flex flex-col gap-3"
          >
            <p className="t-label text-fg-muted">{t(column.title)}</p>
            {column.links.map((link) => (
              <Link
                {...navFade}
                key={link.href}
                href={link.href}
                className="t-body-s inline-flex min-h-8 items-center text-fg-muted transition-colors hover:text-fg"
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-[1376px] flex-wrap items-center justify-between gap-4 px-4 py-6 md:px-6 xl:px-12">
          <p className="t-caption text-fg-muted">
            <span className="t-data">© {year}</span> {t("product.name")}.{" "}
            {t("footer.rights")}
          </p>
          <LocaleSwitch label={t("footer.language")} />
        </div>
      </div>
    </footer>
  );
}
