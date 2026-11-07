"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useLocale, useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  Bookmark,
  Bot,
  ShieldCheck,
  Wallet,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ClipboardList,
  CreditCard,
  Inbox,
  Clock3,
  FilePlus2,
  LogIn,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  handSpokiAsk,
  onSpokiAsk,
  SPOKI_ATTACH,
  SPOKI_CONVERSATION,
  SPOKI_PROFILE,
  SPOKI_TURN_DONE,
} from "@/components/bot/spoki-ask";
import { PROFILE_DRAFT_KEY, ProfileDialog } from "./profile-dialog";
import { profileRequest, type ProfileDraft } from "./profile-request";
import type { ChatThread } from "@/app/api/me/threads/route";
import type { MyConversation } from "@/modules/bot/service";
import { ContactRoom, type StatusLabels } from "./contact-room";
import { SettingsPanelView, type SettingsPanel } from "./settings-panels";
import { PAY_PLANS, type PayPlan } from "./billing-panel";
import { isChatOpen, type ChatOpen } from "@/config/chat-only";
import { isLoginNext, type LoginNext } from "@/components/auth/login-next";

type Item = { key: string; icon: LucideIcon };

const SHORTCUTS: Item[] = [
  { key: "jobs", icon: BriefcaseBusiness },
  { key: "freelance", icon: Sparkles },
];
const MORE: Item[] = [
  { key: "events", icon: CalendarDays },
  { key: "salaries", icon: Banknote },
  { key: "applications", icon: ClipboardList },
  { key: "inbox", icon: Inbox },
  { key: "settings", icon: Bell },
  { key: "plans", icon: CreditCard },
];
const EMPLOYER: Item[] = [
  { key: "postJob", icon: FilePlus2 },
  { key: "myJobs", icon: Users },
];

/** The mockup's easing for the menu's change of shape. */
const EASE = [0.22, 1, 0.36, 1] as const;

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

function watchViewport(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

/** "width height", a string so the store compares by value. */
function readViewport() {
  return `${window.innerWidth} ${window.innerHeight}`;
}

/**
 * The chat home of TZ 53, built on the Morrow mockup: a round menu button
 * that opens "about" before the chat starts and turns into the sidebar
 * once it has, and the platform chat as the whole screen. Every item asks
 * the chat; dialogues and threads with clients and recruiters open beside it.
 */
export function MorrowHome({
  signedIn,
  wordmark,
  statusLabels,
  mcpScopes,
  children,
}: {
  signedIn: boolean;
  wordmark: string;
  statusLabels: StatusLabels;
  mcpScopes: readonly string[];
  children: ReactNode;
}) {
  const t = useTranslations("morrow");
  const profileText = useTranslations("morrow.profile");
  const locale = useLocale();
  const [profileOpen, setProfileOpen] = useState<"profile" | "signin" | null>(
    null,
  );
  const reduceMotion = useReducedMotion();
  const light = useSyncExternalStore(watchTheme, readLight, () => false);
  const [width, height] = useSyncExternalStore(
    watchViewport,
    readViewport,
    () => "1024 768",
  )
    .split(" ")
    .map(Number);
  const phone = useSyncExternalStore(
    watchViewport,
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
  const [dialogues, setDialogues] = useState<MyConversation[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [panel, setPanel] = useState<SettingsPanel | null>(null);
  const [payPlan, setPayPlan] = useState<PayPlan | null>(null);
  const [loginNext, setLoginNext] = useState<LoginNext | undefined>();
  /** Changing it remounts the chat on the thread the cookie now names. */
  const [chatKey, setChatKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const open = threads.find((thread) => thread.id === openId) ?? null;
  const hasConversation =
    started ||
    open !== null ||
    panel !== null ||
    dialogues.some((row) => !row.current);
  const expanded = hasConversation && sidebar && (!phone || infoOpen);
  const showInfo = !hasConversation && infoOpen;
  const query = search.trim().toLowerCase();
  const shownThreads = threads.filter((thread) =>
    `${thread.kind === "recruiter" ? thread.company : ""} ${thread.title}`
      .toLowerCase()
      .includes(query),
  );
  const shownDialogues = dialogues.filter((row) =>
    (row.title ?? t("untitled")).toLowerCase().includes(query),
  );
  const duration = reduceMotion ? 0 : 0.38;

  const loadLists = useCallback(async () => {
    try {
      const response = await fetch("/api/bot/conversations", {
        cache: "no-store",
      });
      if (response.ok) {
        const body = (await response.json()) as {
          conversations?: MyConversation[];
        };
        setDialogues(body.conversations ?? []);
      }
    } catch {
      // The list stays as it was.
    }
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
    const refresh = () => void loadLists();
    const first = window.setTimeout(refresh, 0);
    const conversation = (event: Event) =>
      setStarted((event as CustomEvent<boolean>).detail === true);
    window.addEventListener(SPOKI_TURN_DONE, refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener(SPOKI_CONVERSATION, conversation);
    const profile = () => setProfileOpen("profile");
    window.addEventListener(SPOKI_PROFILE, profile);
    return () => {
      window.removeEventListener(SPOKI_PROFILE, profile);
      window.clearTimeout(first);
      window.removeEventListener(SPOKI_TURN_DONE, refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(SPOKI_CONVERSATION, conversation);
    };
  }, [loadLists]);

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

  // A profile typed before signing in goes to Spoki once the link signed
  // this tab in; Spoki's card saves it.
  useEffect(() => {
    if (!signedIn) return;
    const first = window.setTimeout(() => {
      let draft: ProfileDraft | null = null;
      try {
        const stored = window.sessionStorage.getItem(PROFILE_DRAFT_KEY);
        window.sessionStorage.removeItem(PROFILE_DRAFT_KEY);
        draft = stored ? (JSON.parse(stored) as ProfileDraft) : null;
      } catch {
        draft = null;
      }
      if (draft) saveProfile(draft);
    }, 0);
    return () => window.clearTimeout(first);
    // Runs once on the first signed-in render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn]);

  function saveProfile(draft: ProfileDraft) {
    setProfileOpen(null);
    setOpenId(null);
    handSpokiAsk(
      profileRequest(draft, (key, values) =>
        profileText(key as never, values as never),
      ),
      draft.cv ?? undefined,
    );
  }

  const openFromAddress = useEffectEvent((action: ChatOpen, next?: LoginNext) =>
    runOpen(action, next),
  );

  // Spoki opens a panel by its link: `/?panel=account`, `assistants` or
  // `billing`. Without a session (a link from Telegram) it asks to sign in.
  useEffect(() => {
    const first = window.setTimeout(() => {
      const url = new URL(window.location.href);
      // A closed cabinet page sent the person here (CHAT_ONLY, TZ 53).
      const opened = url.searchParams.get("open");
      if (isChatOpen(opened)) {
        const next = url.searchParams.get("next") ?? undefined;
        url.searchParams.delete("open");
        url.searchParams.delete("next");
        window.history.replaceState(null, "", url);
        openFromAddress(opened, isLoginNext(next) ? next : undefined);
        return;
      }
      const asked = url.searchParams.get("panel");
      if (asked !== "account" && asked !== "assistants" && asked !== "billing")
        return;
      if (!signedIn) {
        setProfileOpen("signin");
        return;
      }
      const plan = url.searchParams.get("plan");
      url.searchParams.delete("panel");
      url.searchParams.delete("plan");
      window.history.replaceState(null, "", url);
      setPayPlan(
        PAY_PLANS.includes(plan as PayPlan) ? (plan as PayPlan) : null,
      );
      setPanel(asked);
    }, 0);
    return () => window.clearTimeout(first);
  }, [signedIn]);

  /** What a closed page did, done on the chat home. */
  function runOpen(action: ChatOpen, next?: LoginNext) {
    if (action === "signin" || action === "signup") {
      setLoginNext(next);
      setProfileOpen(
        signedIn ? "profile" : action === "signin" ? "signin" : "profile",
      );
      return;
    }
    if (action === "profile") {
      setProfileOpen("profile");
      return;
    }
    if (
      action === "account" ||
      action === "assistants" ||
      action === "billing"
    ) {
      if (!signedIn) {
        setProfileOpen("signin");
        return;
      }
      setPayPlan(null);
      setPanel(action);
      return;
    }
    handSpokiAsk(t(`prompts.${action}`));
  }

  function openPanel(next: SettingsPanel) {
    act(() => {
      setOpenId(null);
      setPayPlan(null);
      setPanel(next);
    });
  }

  // A question handed to Spoki from a panel shows the chat again.
  useEffect(
    () =>
      onSpokiAsk(() => {
        setPanel(null);
        setOpenId(null);
      }),
    [],
  );

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
      setPanel(null);
      handSpokiAsk(t(`prompts.${key}`));
    });
  }

  /** Points the chat at another thread and draws it again. */
  async function switchTo(request: () => Promise<Response>) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await request();
      if (!response.ok) return;
      setOpenId(null);
      setStarted(false);
      setChatKey((key) => key + 1);
      await loadLists();
    } finally {
      setBusy(false);
    }
  }

  function newConversation() {
    act(
      () =>
        void switchTo(() =>
          fetch(`/api/bot/conversations?locale=${encodeURIComponent(locale)}`, {
            method: "POST",
          }),
        ),
    );
  }

  function openDialogue(row: MyConversation) {
    if (row.current) {
      act(() => setOpenId(null));
      return;
    }
    act(
      () =>
        void switchTo(() =>
          fetch(`/api/bot/conversations/${row.id}`, { method: "POST" }),
        ),
    );
  }

  async function deleteDialogue(row: MyConversation) {
    const title = row.title ?? t("untitled");
    if (!window.confirm(t("deleteConfirm", { title }))) return;
    const response = await fetch(`/api/bot/conversations/${row.id}`, {
      method: "DELETE",
    });
    if (!response.ok) return;
    if (row.current) newConversation();
    else await loadLists();
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
        onClick={() => act(() => setProfileOpen("profile"))}
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
      {signedIn ? (
        <>
          <button
            type="button"
            className="menu-action"
            aria-current={panel === "account" ? "page" : undefined}
            disabled={!hydrated}
            onClick={() => openPanel("account")}
          >
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{t("panels.account.title")}</span>
          </button>
          <button
            type="button"
            className="menu-action"
            aria-current={panel === "assistants" ? "page" : undefined}
            disabled={!hydrated}
            onClick={() => openPanel("assistants")}
          >
            <Bot size={16} aria-hidden="true" />
            <span>{t("panels.assistants.title")}</span>
          </button>
          <button
            type="button"
            className="menu-action"
            aria-current={panel === "billing" ? "page" : undefined}
            disabled={!hydrated}
            onClick={() => openPanel("billing")}
          >
            <Wallet size={16} aria-hidden="true" />
            <span>{t("panels.billing.title")}</span>
          </button>
        </>
      ) : null}
      {signedIn ? null : (
        <button
          type="button"
          className="menu-action"
          disabled={!hydrated}
          onClick={() => act(() => setProfileOpen("signin"))}
        >
          <LogIn size={16} aria-hidden="true" />
          <span>{t("signIn")}</span>
        </button>
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
      <AnimatePresence>
        {expanded && phone ? (
          <motion.button
            key="scrim"
            type="button"
            className="sidebar-scrim"
            aria-label={t("closeMenu")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => {
              setInfoOpen(false);
              setSidebar(false);
            }}
          />
        ) : null}
      </AnimatePresence>
      {/* framer-motion writes style attributes into server HTML, which the
          site's CSP refuses; the animated menu starts after hydration. */}
      {hydrated ? (
        <motion.div
          ref={root}
          className={`chat-menu ${expanded ? "is-sidebar" : ""}`}
          role={expanded && phone ? "dialog" : undefined}
          aria-modal={expanded && phone ? true : undefined}
          aria-label={expanded && phone ? t("menu") : undefined}
          initial={false}
          animate={{
            width: expanded ? Math.min(300, width - 40) : 44,
            height: expanded ? height : 44,
            top: expanded ? 0 : 20,
            left: expanded ? 0 : 20,
            borderRadius: expanded ? 0 : 22,
          }}
          transition={{ duration, ease: EASE }}
        >
          <motion.button
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
            initial={false}
            animate={{ left: expanded ? 16 : 0, top: expanded ? 16 : 0 }}
            transition={{ duration, ease: EASE }}
            whileTap={reduceMotion ? undefined : { scale: 0.92 }}
            onClick={onTrigger}
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                key={expanded ? "collapse" : "dots"}
                initial={{ opacity: 0, rotate: -45 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 45 }}
                transition={{ duration: reduceMotion ? 0 : 0.1 }}
              >
                {expanded ? (
                  <PanelLeftClose size={18} aria-hidden="true" />
                ) : (
                  <MoreHorizontal size={21} aria-hidden="true" />
                )}
              </motion.span>
            </AnimatePresence>
            <span className="sr-only">
              {expanded
                ? t("closeMenu")
                : hasConversation
                  ? t("openMenu")
                  : t("about")}
            </span>
          </motion.button>
          <AnimatePresence>
            {expanded ? (
              <motion.nav
                key="sidebar"
                id="workspace-sidebar"
                aria-label={t("menu")}
                className="sidebar-content"
                initial={{ opacity: 0, x: reduceMotion ? 0 : -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{
                  opacity: 0,
                  transition: { duration: reduceMotion ? 0 : 0.08 },
                }}
                transition={{
                  delay: reduceMotion ? 0 : 0.1,
                  duration: reduceMotion ? 0 : 0.22,
                }}
              >
                <div className="sidebar-brand">{wordmark}</div>
                <motion.div className="sidebar-scroll" layoutScroll>
                  <button
                    type="button"
                    className="menu-action new-dialogue"
                    disabled={!hydrated || busy}
                    onClick={newConversation}
                  >
                    <Plus size={16} aria-hidden="true" />
                    <span>{t("newConversation")}</span>
                  </button>
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
                    {shownDialogues.map((row) => {
                      const title = row.title ?? t("untitled");
                      const current = row.current && open === null;
                      return (
                        <div className="dialogue-row" key={row.id}>
                          <button
                            type="button"
                            className="menu-action"
                            aria-current={current ? "page" : undefined}
                            disabled={busy}
                            onClick={() => openDialogue(row)}
                          >
                            <span>{title}</span>
                            {current ? (
                              <Check size={13} aria-hidden="true" />
                            ) : null}
                          </button>
                          {signedIn ? (
                            <button
                              type="button"
                              className="delete-dialogue"
                              title={t("deleteDialogue", { title })}
                              onClick={() => void deleteDialogue(row)}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                              <span className="sr-only">
                                {t("deleteDialogue", { title })}
                              </span>
                            </button>
                          ) : null}
                        </div>
                      );
                    })}
                    {query &&
                    shownDialogues.length + shownThreads.length === 0 ? (
                      <p className="menu-note">{t("noDialogues")}</p>
                    ) : null}
                    <motion.div
                      layout="position"
                      transition={{
                        layout: {
                          duration: reduceMotion ? 0 : 0.28,
                          ease: "easeOut",
                        },
                      }}
                      className={`contact-conversations ${threads.length ? "has-contacts" : ""}`}
                    >
                      <div className="contact-heading">
                        {t("contacts.heading")}
                      </div>
                      {shownThreads.map((thread) => (
                        <div className="dialogue-row" key={thread.id}>
                          <button
                            type="button"
                            className="menu-action"
                            aria-current={
                              thread.id === openId ? "page" : undefined
                            }
                            onClick={() =>
                              act(() => {
                                setPanel(null);
                                setOpenId(thread.id);
                              })
                            }
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
                      ) : null}
                    </motion.div>
                  </div>
                </motion.div>
                <div className="sidebar-footer">{footer}</div>
              </motion.nav>
            ) : null}
            {showInfo ? (
              <motion.div
                key="info"
                id="morrow-info"
                role="dialog"
                aria-label={t("about")}
                className="menu-panel"
                initial={{
                  opacity: 0,
                  scale: reduceMotion ? 1 : 0.9,
                  y: reduceMotion ? 0 : -8,
                }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.95 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                style={{ transformOrigin: "top left" }}
              >
                <div className="menu-name">
                  {t("aboutTitle", { name: wordmark })}
                  <span>{t("aboutLead")}</span>
                </div>
                {shortcuts}
                <p className="menu-note">{t("aboutText")}</p>
                <div className="menu-divider" />
                {footer}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="chat-menu">
          <button type="button" className="menu-trigger" disabled>
            <MoreHorizontal size={21} aria-hidden="true" />
            <span className="sr-only">{t("about")}</span>
          </button>
        </div>
      )}
      {profileOpen ? (
        <ProfileDialog
          signedIn={signedIn}
          startWith={profileOpen}
          next={loginNext}
          onClose={() => setProfileOpen(null)}
          onSave={saveProfile}
        />
      ) : null}
      <section className="workspace-host">
        {panel ? (
          <SettingsPanelView
            key={`${panel}-${payPlan ?? ""}`}
            panel={panel}
            scopes={mcpScopes}
            plan={payPlan}
          />
        ) : open ? (
          <ContactRoom key={open.id} thread={open} labels={statusLabels} />
        ) : null}
        {/* The chat stays mounted under a thread, so its turn is not lost;
            a new key draws it again on another dialogue. */}
        <div
          key={chatKey}
          className="morrow-chat"
          hidden={open !== null || panel !== null}
        >
          {children}
        </div>
      </section>
    </div>
  );
}
