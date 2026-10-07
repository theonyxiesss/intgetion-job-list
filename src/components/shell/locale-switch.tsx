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
    <nav aria-label={nav("language")} className="flex gap-4">
      {routing.locales.map((locale) =>
        locale === current ? (
          <span
            key={locale}
            aria-current="true"
            className="t-caption text-fg"
            lang={locale}
          >
            {t(`native.${locale}`)}
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
            {t(`native.${locale}`)}
          </Link>
        ),
      )}
    </nav>
  );
}
