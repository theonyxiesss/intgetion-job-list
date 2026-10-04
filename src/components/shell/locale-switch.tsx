"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** EN / RU on the same page. Full names stay as accessible names. */
export function LocaleSwitch({
  className,
  label,
}: {
  className?: string;
  /** Distinct landmark name when the switch appears twice on a page. */
  label?: string;
}) {
  const t = useTranslations();
  const pathname = usePathname();
  const current = useLocale();
  return (
    <nav
      aria-label={label ?? t("nav.language")}
      className={cn("flex items-center", className)}
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          aria-label={t(`locale.${locale}`)}
          aria-current={locale === current ? "true" : undefined}
          className={cn(
            "t-nav inline-flex min-h-11 min-w-11 items-center justify-center",
            locale === current ? "text-fg" : "text-fg-muted hover:text-fg",
          )}
        >
          {t(`locale.short.${locale}`)}
        </Link>
      ))}
    </nav>
  );
}
