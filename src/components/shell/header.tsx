import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const t = useTranslations();

  return (
    <header className="border-b border-current/15">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <Link href="/" className="min-h-11 text-lg font-semibold">
          {t("product.name")}
        </Link>
        <nav aria-label={t("nav.main")} className="flex flex-1 gap-2">
          <a href="#search" className="inline-flex min-h-11 items-center px-2">
            {t("home.findJob")}
          </a>
          <a href="#post" className="inline-flex min-h-11 items-center px-2">
            {t("home.postJob")}
          </a>
        </nav>
        <nav aria-label={t("nav.language")} className="flex gap-1">
          {routing.locales.map((locale) => (
            <Link
              key={locale}
              href="/"
              locale={locale}
              className="inline-flex min-h-11 items-center px-2"
            >
              {t(`locale.${locale}`)}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
