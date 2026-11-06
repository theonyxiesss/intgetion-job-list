"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardList,
  Clock3,
  FilePlus2,
  LogIn,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Paperclip,
  Search,
  Sparkles,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  handSpokiAsk,
  SPOKI_ATTACH,
  SPOKI_CONVERSATION,
  SPOKI_TURN_DONE,
} from "@/components/bot/spoki-ask";
import type { ChatThread } from "@/app/api/me/threads/route";
import { ContactRoom, type StatusLabels } from "./contact-room";

type Item = { key: string; icon: LucideIcon };

const SHORTCUTS: Item[] = [
  { key: "jobs", icon: BriefcaseBusiness },
  { key: "freelance", icon: Sparkles },
];
const MORE: Item[] = [
  { key: "events", icon: CalendarDays },
  { key: "salaries", icon: Banknote },
  { key: "applications", icon: ClipboardList },
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

const PHONE = "(max-width: 760px)";

function watchPhone(onChange: () => void) {
  const query = window.matchMedia(PHONE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The chat home of TZ 53, built on the Morrow mockup: a round menu button
 * that opens "about" before the chat starts and turns into the sidebar
 * once it has, and the platform chat as the whole screen. Every item asks
 * the one chat; threads with clients and recruiters open beside it.
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
  const light = useSyncExternalStore(watchTheme, readLight, () => false);
  const phone = useSyncExternalStore(
    watchPhone,
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
  // A click before hydration has no handler and would be lost.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const [started, setStarted] = useState(false);
  const [sidebar, setSidebar] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = threads.find((thread) => thread.id === openId) ?? null;
  const hasConversation = started || open !== null;
  const expanded = hasConversation && sidebar && (!phone || infoOpen);
  const showInfo = !hasConversation && infoOpen;
  const query = search.trim().toLowerCase();
  const shown = threads.filter((thread) =>
    `${thread.kind === "recruiter" ? thread.company : ""} ${thread.title}`
      .toLowerCase()
      .includes(query),
  );

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
    const conversation = (event: Event) =>
      setStarted((event as CustomEvent<boolean>).detail === true);
    window.addEventListener(SPOKI_TURN_DONE, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(SPOKI_CONVERSATION, conversation);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(SPOKI_TURN_DONE, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(SPOKI_CONVERSATION, conversation);
    };
  }, [loadThreads]);

  useEffect(() => {
    if (!expanded && !showInfo) return;
    const dismiss = (event: PointerEvent) => {
      if (showInfo && !root.current?.contains(event.target as Node))
        setInfoOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setInfoOpen(false);
      if (phone) setSidebar(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", keyboard);
    };
  }, [expanded, showInfo, phone]);

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

  /** Runs a menu action and closes what covers the chat. */
  function act(callback: () => void) {
    setInfoOpen(false);
    if (phone) setSidebar(false);
    callback();
  }

  function ask(key: string) {
    act(() => {
      setOpenId(null);
      handSpokiAsk(t(`prompts.${key}`));
    });
  }

  function onTrigger() {
    if (!hasConversation) {
      setInfoOpen(!infoOpen);
      return;
    }
    if (phone) {
      setSidebar(true);
      setInfoOpen(!infoOpen);
    } else setSidebar(!sidebar);
  }

  const shortcuts = (
    <div className="search-templates">
      {SHORTCUTS.map(({ key, icon: ItemIcon }) => (
        <button
          key={key}
          type="button"
          className="search-template"
          disabled={!hydrated}
          onClick={() => ask(key)}
        >
          <ItemIcon size={17} aria-hidden="true" />
          <span>
            <b>{t(`items.${key}`)}</b>
            <small>{t(`items.${key}Hint` as "items.jobsHint")}</small>
          </span>
          <ArrowUpRight size={14} aria-hidden="true" />
        </button>
      ))}
    </div>
  );

  const actions = (items: Item[]) =>
    items.map(({ key, icon: ItemIcon }) => (
      <button
        key={key}
        type="button"
        className="menu-action"
        disabled={!hydrated}
        onClick={() => ask(key)}
      >
        <ItemIcon size={16} aria-hidden="true" />
        <span>{t(`items.${key}`)}</span>
      </button>
    ));

  const footer = (
    <>
      <button
        type="button"
        className="menu-action"
        disabled={!hydrated}
        onClick={() => ask("profile")}
      >
        <UserRound size={16} aria-hidden="true" />
        <span>{t("items.profile")}</span>
      </button>
      <button
        type="button"
        className="menu-action"
        disabled={!hydrated}
        onClick={() => ask("saved")}
      >
        <Bookmark size={16} aria-hidden="true" />
        <span>{t("items.saved")}</span>
      </button>
      <button
        type="button"
        className="menu-action"
        disabled={!hydrated}
        onClick={() =>
          act(() => {
            setOpenId(null);
            window.dispatchEvent(new Event(SPOKI_ATTACH));
          })
        }
      >
        <Paperclip size={16} aria-hidden="true" />
        <span>{t("attachCv")}</span>
      </button>
      {signedIn ? null : (
        <Link
          href={{ pathname: "/login", query: { next: "/" } }}
          className="menu-action"
        >
          <LogIn size={16} aria-hidden="true" />
          <span>{t("signIn")}</span>
        </Link>
      )}
      <button type="button" className="menu-action" onClick={toggleTheme}>
        {light ? (
          <Moon size={16} aria-hidden="true" />
        ) : (
          <Sun size={16} aria-hidden="true" />
        )}
        <span>{light ? t("themeDark") : t("themeLight")}</span>
      </button>
    </>
  );

  return (
    <div className={`morrow app ${expanded ? "sidebar-expanded" : ""}`}>
      {expanded && phone ? (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label={t("closeMenu")}
          onClick={() => {
            setInfoOpen(false);
            setSidebar(false);
          }}
        />
      ) : null}
      <div
        ref={root}
        className={`chat-menu ${expanded ? "is-sidebar" : ""}`}
        role={expanded && phone ? "dialog" : undefined}
        aria-modal={expanded && phone ? true : undefined}
        aria-label={expanded && phone ? t("menu") : undefined}
      >
        <button
          ref={trigger}
          type="button"
          className="menu-trigger"
          aria-expanded={expanded || showInfo}
          aria-controls={
            expanded
              ? "workspace-sidebar"
              : showInfo
                ? "morrow-info"
                : undefined
          }
          onClick={onTrigger}
        >
          {expanded ? (
            <PanelLeftClose size={18} aria-hidden="true" />
          ) : (
            <MoreHorizontal size={21} aria-hidden="true" />
          )}
          <span className="sr-only">
            {expanded
              ? t("closeMenu")
              : hasConversation
                ? t("openMenu")
                : t("about")}
          </span>
        </button>
        {expanded ? (
          <nav
            id="workspace-sidebar"
            aria-label={t("menu")}
            className="sidebar-content"
          >
            <div className="sidebar-brand">{wordmark}</div>
            <div className="sidebar-scroll">
              <div className="menu-label">{t("discover")}</div>
              {shortcuts}
              {actions(MORE)}
              <div className="menu-label">{t("employer")}</div>
              {actions(EMPLOYER)}
              <div className="menu-divider" />
              <div className="menu-label">
                <Clock3 size={12} aria-hidden="true" />
                {t("dialogues")}
              </div>
              <label className="menu-search">
                <Search size={14} aria-hidden="true" />
                <input
                  aria-label={t("searchDialogues")}
                  placeholder={t("searchDialogues")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="menu-history">
                <div className="dialogue-row">
                  <button
                    type="button"
                    className="menu-action"
                    aria-current={open ? undefined : "page"}
                    onClick={() => act(() => setOpenId(null))}
                  >
                    <span>{t("contacts.assistant")}</span>
                    {open ? null : <Check size={13} aria-hidden="true" />}
                  </button>
                </div>
                <div
                  className={`contact-conversations ${threads.length ? "has-contacts" : ""}`}
                >
                  <div className="contact-heading">{t("contacts.heading")}</div>
                  {shown.map((thread) => (
                    <div className="dialogue-row" key={thread.id}>
                      <button
                        type="button"
                        className="menu-action"
                        aria-current={thread.id === openId ? "page" : undefined}
                        onClick={() => act(() => setOpenId(thread.id))}
                      >
                        <span>
                          {thread.kind === "recruiter"
                            ? `${thread.company} · ${thread.title}`
                            : thread.title}
                        </span>
                        <small>
                          {thread.kind === "recruiter"
                            ? (statusLabels.application[thread.status] ??
                              thread.status)
                            : (statusLabels.order[thread.status] ??
                              thread.status)}
                        </small>
                      </button>
                    </div>
                  ))}
                  {threads.length === 0 ? (
                    <p className="menu-note">
                      {signedIn ? t("contacts.empty") : t("contacts.guest")}
                    </p>
                  ) : shown.length === 0 ? (
                    <p className="menu-note">{t("noDialogues")}</p>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="sidebar-footer">{footer}</div>
          </nav>
        ) : null}
        {showInfo ? (
          <div
            id="morrow-info"
            role="dialog"
            aria-label={t("about")}
            className="menu-panel"
          >
            <div className="menu-name">
              {t("aboutTitle", { name: wordmark })}
              <span>{t("aboutLead")}</span>
            </div>
            {shortcuts}
            <p className="menu-note">{t("aboutText")}</p>
            <div className="menu-divider" />
            {footer}
          </div>
        ) : null}
      </div>
      <section className="workspace-host">
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
