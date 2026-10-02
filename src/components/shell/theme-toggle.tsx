"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function readTheme(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function subscribe(onStoreChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function ThemeToggle() {
  const t = useTranslations("nav");
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light");

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <div className="flex gap-1" role="group" aria-label={t("theme")}>
      <button
        type="button"
        className="min-h-11 rounded-md px-3"
        aria-pressed={theme === "light"}
        onClick={() => choose("light")}
      >
        {t("themeLight")}
      </button>
      <button
        type="button"
        className="min-h-11 rounded-md px-3"
        aria-pressed={theme === "dark"}
        onClick={() => choose("dark")}
      >
        {t("themeDark")}
      </button>
    </div>
  );
}
