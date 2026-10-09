"use client";

import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * D335: the same page in the other language. The link goes through the
 * locale middleware, which remembers the choice in a cookie for a year, so
 * the browser language no longer decides.
 */
export function LocaleSwitch() {
  const t = useTranslations("locale");
  const nav = useTranslations("nav");
  const current = useLocale();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return (
    <nav
      aria-label={nav("language")}
      className="flex max-w-full flex-wrap items-center gap-x-3 gap-y-1"
    >
      {routing.locales.map((locale) => {
        const native = t(`native.${locale}`);
        const short = t(`short.${locale}`);
        const label = (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="hidden sm:inline">{native}</span>
          </>
        );
        return locale === current ? (
          <span
            key={locale}
            aria-current="true"
            className="t-caption text-fg"
            lang={locale}
          >
            {label}
          </span>
        ) : (
          <Link
            key={locale}
            href={search ? `${pathname}?${search}` : pathname}
            locale={locale}
            lang={locale}
            hrefLang={locale}
            className="t-caption text-fg-subtle transition-colors hover:text-fg"
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
