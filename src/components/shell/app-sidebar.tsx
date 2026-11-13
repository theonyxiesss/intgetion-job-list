"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Logo } from "@/components/ui/logo";
import { LanguagePicker } from "./language-picker";
import {
  groupActive,
  isGroup,
  sidebarActive,
  sidebarItems,
  type SidebarIcon,
} from "./app-sidebar-items";

/** Icons of flyout items, by address (mockup flyouts). */
const CHILD_ICONS: Record<string, string> = {
  "/employer/jobs":
    "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c1-4 4-6 7-6s6 2 7 6M17 11a3 3 0 1 0 0-6M22 21c-.6-2.6-2-4.3-4-5",
  "/jobs": "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  "/freelance": "M4 7h16M4 12h10M4 17h7",
  "/freelance/tasks": "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  "/employer/billing": "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  "/billing/crypto":
    "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l11-3v3M16 13h.01",
};

/** Sign-in and checkout are full screen in the mockup: no side menu there. */
const AUTH_PAGES = [
  "/login",
  "/register",
  "/reset-password",
  "/auth",
  "/billing/crypto",
];

/** Labels resolved on the server: message key -> text (UI_V2). */
export type AppSidebarLabels = Record<string, string>;
/** A recent Spoki thread for the menu: its address and first question. */
export type SidebarRecentChat = { href: string; title: string };

const PATHS: Record<SidebarIcon, string> = {
  jobs: "M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  freelance: "M4 7h16M4 12h10M4 17h7",
  ugc: "M4 6h11v12H4zM15 10l5-3v10l-5-3",
  turnkey:
    "M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.4 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8zM5 21h14",
  events: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0",
  profile: "M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1.5-4 4.5-6 8-6s6.5 2 8 6",
  pricing:
    "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  finance: "M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1zM4 7l11-3v3",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 7v5l3 2",
  messages: "M4 5h16v11H8l-4 4z",
};

function Stroke({ d, size = 17 }: { d: string; size?: number }): ReactNode {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const ROW =
  "flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm text-fg transition-colors hover:bg-surface-2";
const ROW_ACTIVE = "bg-surface-2 text-fg";

/**
 * Left menu of the v2 shell: new chat, sections, groups that open in place,
 * account and settings at the bottom. Desktop only; phones keep MobileNav.
 */
export function AppSidebar({
  labels,
  signedIn,
  recent = [],
}: {
  labels: AppSidebarLabels;
  signedIn: boolean;
  recent?: readonly SidebarRecentChat[];
}) {
  const pathname = usePathname();
  const t = (key: string) => labels[key] ?? key;
  const authPage = AUTH_PAGES.some((page) => sidebarActive(pathname, page));
  // The mockup's flyout: a group opens a panel to the right of the menu.
  const [open, setOpen] = useState<{
    label: string;
    top: number;
    left: number;
  } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
  }
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-flyout-trigger]")) return;
      setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const openGroup = sidebarItems.find(
    (item) => isGroup(item) && item.label === open?.label,
  );

  if (authPage) return null;

  return (
    <nav
      aria-label={t("nav.rail")}
      data-sidebar
      className="sticky top-0 hidden h-dvh w-[280px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface px-3 py-3.5 md:flex"
    >
      <div className="flex items-center justify-between px-1.5 py-1">
        <Link href="/" className="flex items-center">
          <Logo name={t("product.wordmark")} />
        </Link>
      </div>

      <Link
        href="/chat"
        className="flex min-h-11 items-center gap-2.5 rounded-xl bg-surface-2 px-3 text-sm font-semibold hover:bg-line-strong"
      >
        <Stroke d="M12 5v14M5 12h14" size={18} />
        {t("nav.newChat")}
      </Link>

      <p className="px-3 pt-2 text-xs text-fg-subtle">{t("nav.sections")}</p>
      <ul className="flex flex-col gap-0.5">
        {sidebarItems.map((item) => {
          if (!isGroup(item)) {
            const on = sidebarActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={on ? "page" : undefined}
                  className={`${ROW} ${on ? ROW_ACTIVE : ""}`}
                >
                  <Stroke d={PATHS[item.icon]} />
                  <span className="flex-1">{t(item.label)}</span>
                </Link>
              </li>
            );
          }
          const expanded = open?.label === item.label;
          const inside = groupActive(pathname, item);
          const panelId = `sidebar-${item.icon}`;
          return (
            <li key={item.label}>
              <button
                type="button"
                data-flyout-trigger
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={(event) => {
                  if (expanded) return setOpen(null);
                  const box = event.currentTarget.getBoundingClientRect();
                  setOpen({
                    label: item.label,
                    top: Math.min(box.top - 8, window.innerHeight - 340),
                    left: box.right + 12,
                  });
                }}
                className={`${ROW} w-full text-left ${inside || expanded ? ROW_ACTIVE : ""}`}
              >
                <Stroke d={PATHS[item.icon]} />
                <span className="flex-1">{t(item.label)}</span>
                <Stroke d="M9 6l6 6-6 6" size={14} />
              </button>
            </li>
          );
        })}
      </ul>

      {open && openGroup && isGroup(openGroup) ? (
        <div
          ref={panelRef}
          id={`sidebar-${openGroup.icon}`}
          style={{ top: Math.max(open.top, 8), left: open.left }}
          className="fixed z-50 flex w-[290px] flex-col gap-0.5 rounded-2xl border border-line-strong bg-surface p-2 shadow-2xl"
        >
          {openGroup.children.map((child, index) => {
            const on = pathname === child.href;
            const next = openGroup.children[index + 1];
            return (
              <div key={child.href} className="flex flex-col">
                <Link
                  href={child.href}
                  aria-current={on ? "page" : undefined}
                  className={`flex min-h-10 items-start gap-3 rounded-xl px-3 py-2 hover:bg-surface-2 ${on ? "bg-surface-2" : ""} ${child.action ? "text-fg-muted" : ""}`}
                >
                  {child.action ? (
                    <span aria-hidden="true" className="leading-6">
                      +
                    </span>
                  ) : CHILD_ICONS[child.href] ? (
                    <span className="mt-1 text-fg-subtle">
                      <Stroke d={CHILD_ICONS[child.href]} size={16} />
                    </span>
                  ) : null}
                  <span className="flex flex-col">
                    <span className="text-sm leading-6 font-medium">
                      {t(child.label)}
                    </span>
                    {child.hint ? (
                      <span className="text-xs text-fg-subtle">
                        {t(child.hint)}
                      </span>
                    ) : null}
                  </span>
                </Link>
                {child.action || (next && !next.hint) ? (
                  <span aria-hidden="true" className="mx-2 my-1 h-px bg-line" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {recent.length > 0 && (
        <div className="flex min-h-0 flex-col gap-0.5">
          <div className="flex items-center justify-between px-3 pt-2">
            <span className="text-xs text-fg-subtle">
              {t("nav.recentChats")}
            </span>
            <Link
              href="/chat/history"
              className="text-xs text-fg-subtle hover:text-fg"
            >
              {t("nav.allChats")}
            </Link>
          </div>
          <ul className="flex flex-col gap-0.5">
            {recent.map((chat) => (
              <li key={chat.href + chat.title}>
                <Link
                  href={chat.href}
                  className="flex min-h-9 items-center truncate rounded-lg px-3 text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
                >
                  <span className="truncate">{chat.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 border-t border-line pt-2.5 pl-1.5">
        <Link
          href={signedIn ? "/account" : "/login"}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-1.5 text-sm hover:bg-surface-2"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-fg-muted"
          >
            <Stroke d={PATHS.profile} size={16} />
          </span>
          <span className="truncate">
            {signedIn ? t("nav.account") : t("nav.login")}
          </span>
        </Link>
        <LanguagePicker variant="menu" />
        {signedIn && (
          <Link
            href="/settings/account"
            aria-label={t("nav.settings")}
            className="flex size-10 items-center justify-center rounded-lg text-fg-muted hover:bg-surface-2 hover:text-fg"
          >
            <Stroke
              d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"
              size={18}
            />
          </Link>
        )}
      </div>
    </nav>
  );
}
