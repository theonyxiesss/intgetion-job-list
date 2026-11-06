"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { handSpokiAsk, SPOKI_TURN_DONE } from "@/components/bot/spoki-ask";
import type { ChatThread } from "@/app/api/me/threads/route";
import { ContactRoom, type StatusLabels } from "./contact-room";

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

function noSubscribe() {
  return () => {};
}

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
  statusLabels,
  children,
}: {
  signedIn: boolean;
  wordmark: string;
  statusLabels: StatusLabels;
  children: ReactNode;
}) {
  const t = useTranslations("morrow");
  const [menuOpen, setMenuOpen] = useState(false);
  const light = useSyncExternalStore(watchTheme, readLight, () => false);
  // A click before hydration has no handler and would be lost.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = threads.find((thread) => thread.id === openId) ?? null;

  const loadThreads = useCallback(async () => {
    if (!signedIn) return;
    try {
      const response = await fetch("/api/me/threads", { cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { threads?: ChatThread[] };
      setThreads(body.threads ?? []);
    } catch {
      // The list stays as it was.
    }
  }, [signedIn]);

  useEffect(() => {
    const refresh = () => void loadThreads();
    const first = window.setTimeout(refresh, 0);
    window.addEventListener(SPOKI_TURN_DONE, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(SPOKI_TURN_DONE, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [loadThreads]);

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
    setOpenId(null);
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
            disabled={!hydrated}
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
          <button
            type="button"
            className="morrow-item"
            aria-current={open ? undefined : "page"}
            onClick={() => {
              setOpenId(null);
              setMenuOpen(false);
            }}
          >
            <MessageCircle size={16} aria-hidden="true" />
            <span>{t("contacts.assistant")}</span>
          </button>
          {group(t("discover"), DISCOVER)}
          {group(t("mine"), MINE)}
          {group(t("employer"), EMPLOYER)}
          <div className="morrow-group">
            <p className="morrow-contact-heading">{t("contacts.heading")}</p>
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className="morrow-item"
                aria-current={thread.id === openId ? "page" : undefined}
                onClick={() => {
                  setOpenId(thread.id);
                  setMenuOpen(false);
                }}
              >
                <span className="morrow-item-text">
                  <span className="morrow-thread-title">
                    {thread.kind === "recruiter"
                      ? `${thread.company} · ${thread.title}`
                      : thread.title}
                  </span>
                  <small>
                    {thread.kind === "recruiter"
                      ? (statusLabels.application[thread.status] ??
                        thread.status)
                      : (statusLabels.order[thread.status] ?? thread.status)}
                  </small>
                </span>
              </button>
            ))}
            {threads.length === 0 ? (
              <p className="morrow-item-text morrow-contact-empty">
                <small>
                  {signedIn ? t("contacts.empty") : t("contacts.guest")}
                </small>
              </p>
            ) : null}
          </div>
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
        {open ? (
          <ContactRoom key={open.id} thread={open} labels={statusLabels} />
        ) : null}
        {/* The chat stays mounted under a thread, so its turn is not lost. */}
        <div className="morrow-chat" hidden={open !== null}>
          {children}
        </div>
      </section>
    </div>
  );
}
