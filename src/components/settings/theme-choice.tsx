"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";

type Theme = "light" | "dark";

/** Same store as the header toggle: `data-theme` plus localStorage (D141). */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}
function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("theme", next);
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  window.dispatchEvent(new Event("storage"));
}

/** Dark or light interface, as two cards (settings «Appearance»). */
export function ThemeChoice() {
  const t = useTranslations("settings.v2");
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark");
  return (
    <section aria-labelledby="theme-title" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="theme-title" className="t-h3">
          {t("theme")}
        </h2>
        <p className="t-body-s text-fg-muted">{t("themeText")}</p>
      </div>
      <div
        role="radiogroup"
        aria-labelledby="theme-title"
        className="grid gap-2 sm:grid-cols-2"
      >
        {(["dark", "light"] as const).map((value) => {
          const on = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => applyTheme(value)}
              className={`flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-left text-sm ${on ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"}`}
            >
              <span
                aria-hidden="true"
                className={`flex size-[18px] items-center justify-center rounded-full border-[1.5px] ${on ? "border-accent" : "border-line-strong"}`}
              >
                {on && <span className="size-2 rounded-full bg-accent" />}
              </span>
              {value === "dark" ? t("themeDark") : t("themeLight")}
            </button>
          );
        })}
      </div>
    </section>
  );
}
