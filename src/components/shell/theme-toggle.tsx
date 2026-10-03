"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Theme = "light" | "dark";

/** Dark unless the user chose light explicitly (D141). */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function ThemeToggle() {
  const t = useTranslations("nav");
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function choose() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode: the choice lasts for this page only.
    }
    window.dispatchEvent(new Event("storage"));
  }

  const label = next === "light" ? t("themeLight") : t("themeDark");
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={choose}
      aria-label={label}
      title={label}
      icon={
        <span
          key={theme}
          className="inline-flex animate-[ui-fade-in_200ms_linear] transition-transform duration-200 group-hover:rotate-90"
        >
          <Icon icon={theme === "dark" ? Sun : Moon} />
        </span>
      }
    />
  );
}
