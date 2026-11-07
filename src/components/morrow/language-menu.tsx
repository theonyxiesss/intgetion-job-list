"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Globe } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  routing,
  type AppLocale,
} from "@/i18n/routing";
import { CHAT_ONLY } from "@/config/chat-only-flag";

/** Keeps the language for a year, as next-intl would. */
function rememberLocale(locale: AppLocale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * The chat home's language setting (TZ 53): addresses carry no language,
 * so the choice lives here and next-intl keeps it in its cookie.
 */
export function LanguageMenu() {
  const t = useTranslations("morrow");
  const names = useTranslations("locale.native");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function choose(next: AppLocale) {
    setOpen(false);
    if (next === locale) return;
    if (CHAT_ONLY) {
      // Addresses carry no language: the cookie is the whole choice. A
      // locale navigation would put `/ru` in the address bar.
      rememberLocale(next);
      window.location.reload();
      return;
    }
    router.replace("/", { locale: next });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        className="menu-action"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Globe size={16} aria-hidden="true" />
        <span>{t("language")}</span>
        <small>{names(locale as AppLocale)}</small>
      </button>
      {open ? (
        <div role="group" aria-label={t("language")} className="menu-languages">
          {routing.locales.map((code) => (
            <button
              key={code}
              type="button"
              lang={code}
              className="menu-action"
              aria-current={code === locale ? "true" : undefined}
              onClick={() => choose(code)}
            >
              <span>{names(code)}</span>
              {code === locale ? <Check size={13} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
