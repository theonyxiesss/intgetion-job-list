"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const GLOBE =
  "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18";

function Globe({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={GLOBE} />
    </svg>
  );
}

/** Same page in another language; the locale cookie remembers it (D335). */
function useSamePage() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * v2 language choice (UI_V2). `menu`: a globe button in the side menu that
 * opens the list in place. `grid`: the full list for settings, each language
 * in its own name with the name in the current language under it.
 */
export function LanguagePicker({ variant }: { variant: "menu" | "grid" }) {
  const t = useTranslations("locale");
  const nav = useTranslations("nav");
  const current = useLocale();
  const href = useSamePage();
  const [open, setOpen] = useState(false);

  const options = routing.locales.map((locale) => {
    const on = locale === current;
    return (
      <li key={locale}>
        <Link
          href={href}
          locale={locale}
          lang={locale}
          hrefLang={locale}
          aria-current={on ? "true" : undefined}
          className={
            variant === "grid"
              ? `flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-sm ${on ? "border-accent bg-surface-2" : "border-line bg-surface hover:bg-surface-2"}`
              : `flex min-h-9 items-center justify-between rounded-lg px-2.5 text-sm hover:bg-surface-2 ${on ? "text-fg" : "text-fg-muted"}`
          }
        >
          {variant === "grid" && (
            <span
              aria-hidden="true"
              className={`flex size-[18px] items-center justify-center rounded-full border-[1.5px] ${on ? "border-accent" : "border-line-strong"}`}
            >
              {on && <span className="size-2 rounded-full bg-accent" />}
            </span>
          )}
          <span className="flex flex-1 flex-col">
            <span>{t(`native.${locale}`)}</span>
            {variant === "grid" && (
              <span className="text-xs text-fg-subtle" lang={current}>
                {t(locale)}
              </span>
            )}
          </span>
          {variant === "menu" && on && (
            <span aria-hidden="true" className="text-accent">
              ✓
            </span>
          )}
        </Link>
      </li>
    );
  });

  if (variant === "grid") {
    return (
      <ul
        aria-label={nav("language")}
        className="grid grid-cols-1 gap-2 sm:grid-cols-2"
      >
        {options}
      </ul>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="sidebar-language"
        aria-label={`${nav("language")}: ${t(`native.${current}`)}`}
        onClick={() => setOpen(!open)}
        className="flex h-10 items-center gap-1.5 rounded-lg px-2 text-xs text-fg-muted hover:bg-surface-2 hover:text-fg"
      >
        <Globe />
        {t(`short.${current}`)}
      </button>
      {open && (
        <ul
          id="sidebar-language"
          className="absolute right-0 bottom-12 z-20 w-[208px] rounded-xl border border-line-strong bg-surface p-1.5 shadow-xl"
        >
          {options}
        </ul>
      )}
    </div>
  );
}
