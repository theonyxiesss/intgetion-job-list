"use client";

import { useState, type ReactNode } from "react";
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

/** Labels resolved on the server: message key -> text (UI_V2). */
export type AppSidebarLabels = Record<string, string>;

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
}: {
  labels: AppSidebarLabels;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const t = (key: string) => labels[key] ?? key;
  const [open, setOpen] = useState<string | null>(() => {
    const active = sidebarItems.find(
      (item) => isGroup(item) && groupActive(pathname, item),
    );
    return active ? active.label : null;
  });

  return (
    <nav
      aria-label={t("nav.rail")}
      data-sidebar
      className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface px-3 py-3.5 md:flex"
    >
      <div className="flex items-center justify-between px-1.5 py-1">
        <Link href="/" className="flex items-center">
          <Logo name={t("product.wordmark")} />
        </Link>
      </div>

      <Link
        href="/chat"
        className="flex min-h-11 items-center gap-2.5 rounded-xl border border-line-strong px-3 text-sm font-medium hover:bg-surface-2"
      >
        <Stroke d="M12 5v14M5 12h14" size={18} />
        {t("nav.newChat")}
      </Link>

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
          const expanded = open === item.label;
          const inside = groupActive(pathname, item);
          const panelId = `sidebar-${item.icon}`;
          return (
            <li key={item.label}>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : item.label)}
                className={`${ROW} w-full text-left ${inside ? ROW_ACTIVE : ""}`}
              >
                <Stroke d={PATHS[item.icon]} />
                <span className="flex-1">{t(item.label)}</span>
                <span
                  className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                >
                  <Stroke d="M9 6l6 6-6 6" size={14} />
                </span>
              </button>
              {expanded && (
                <ul
                  id={panelId}
                  className="mt-0.5 ml-[34px] flex flex-col gap-0.5 border-l border-line pl-2"
                >
                  {item.children.map((child) => {
                    const on = pathname === child.href;
                    return (
                      <li key={child.href}>
                        <Link
                          href={child.href}
                          aria-current={on ? "page" : undefined}
                          className={`flex min-h-9 items-center rounded-lg px-2.5 text-sm hover:bg-surface-2 ${on ? "bg-surface-2 text-fg" : "text-fg-muted"}`}
                        >
                          {t(child.label)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

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
