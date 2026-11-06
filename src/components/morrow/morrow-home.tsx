"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  Banknote,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Bell,
  ClipboardList,
  Menu,
  Moon,
  PanelLeftClose,
  Sparkles,
  Sun,
  UserRound,
  Users,
  FilePlus2,
  LogIn,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { handSpokiAsk } from "@/components/bot/spoki-ask";

type Item = { key: string; icon: LucideIcon; hint?: boolean };

const DISCOVER: Item[] = [
  { key: "jobs", icon: BriefcaseBusiness, hint: true },
  { key: "freelance", icon: Sparkles, hint: true },
  { key: "events", icon: CalendarDays },
  { key: "salaries", icon: Banknote },
];
const MINE: Item[] = [
  { key: "saved", icon: Bookmark },
  { key: "applications", icon: ClipboardList },
  { key: "profile", icon: UserRound },
  { key: "settings", icon: Bell },
];
const EMPLOYER: Item[] = [
  { key: "postJob", icon: FilePlus2 },
  { key: "myJobs", icon: Users },
];

function readLight() {
  return document.documentElement.dataset.theme === "light";
}

function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

/**
 * The chat home of TZ 53 in the Morrow style: a side menu whose every item
 * asks the one platform chat, and the chat itself as the whole screen.
 */
export function MorrowHome({
  signedIn,
  wordmark,
  children,
}: {
  signedIn: boolean;
  wordmark: string;
  children: ReactNode;
}) {
  const t = useTranslations("morrow");
  const [menuOpen, setMenuOpen] = useState(false);
  const light = useSyncExternalStore(watchTheme, readLight, () => false);

  function toggleTheme() {
    const next = !light;
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try {
      localStorage.setItem("theme", next ? "light" : "dark");
    } catch {
      // The choice lasts for this page.
    }
  }

  function ask(key: string) {
    setMenuOpen(false);
    handSpokiAsk(t(`prompts.${key}`));
  }

  function group(title: string, items: Item[]) {
    return (
      <div className="morrow-group">
        <p className="morrow-group-title">{title}</p>
        {items.map(({ key, icon: ItemIcon, hint }) => (
          <button
            key={key}
            type="button"
            className="morrow-item"
            onClick={() => ask(key)}
          >
            <ItemIcon size={16} aria-hidden="true" />
            <span className="morrow-item-text">
              <span>{t(`items.${key}`)}</span>
              {hint ? (
                <small>{t(`items.${key}Hint` as "items.jobsHint")}</small>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`morrow ${menuOpen ? "morrow-menu-open" : ""}`}>
      <aside className="morrow-sidebar">
        <div className="morrow-sidebar-head">
          <span className="morrow-logo">{wordmark}</span>
          <button
            type="button"
            className="morrow-icon-button morrow-only-mobile"
            onClick={() => setMenuOpen(false)}
          >
            <PanelLeftClose size={18} aria-hidden="true" />
            <span className="sr-only">{t("closeMenu")}</span>
          </button>
        </div>
        <nav className="morrow-nav">
          {group(t("discover"), DISCOVER)}
          {group(t("mine"), MINE)}
          {group(t("employer"), EMPLOYER)}
        </nav>
        <div className="morrow-sidebar-foot">
          {signedIn ? null : (
            <Link
              href={{ pathname: "/login", query: { next: "/" } }}
              className="morrow-item"
            >
              <LogIn size={16} aria-hidden="true" />
              <span>{t("signIn")}</span>
            </Link>
          )}
          <button type="button" className="morrow-item" onClick={toggleTheme}>
            {light ? (
              <Moon size={16} aria-hidden="true" />
            ) : (
              <Sun size={16} aria-hidden="true" />
            )}
            <span>{light ? t("themeDark") : t("themeLight")}</span>
          </button>
        </div>
      </aside>
      {menuOpen ? (
        <button
          type="button"
          className="morrow-scrim"
          aria-label={t("closeMenu")}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}
      <section className="morrow-workspace">
        <div className="morrow-topbar morrow-only-mobile">
          <button
            type="button"
            className="morrow-icon-button"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={18} aria-hidden="true" />
            <span className="sr-only">{t("openMenu")}</span>
          </button>
          <span className="morrow-logo">{wordmark}</span>
        </div>
        {children}
      </section>
    </div>
  );
}
