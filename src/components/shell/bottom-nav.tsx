"use client";

import {
  Bot,
  Briefcase,
  Clapperboard,
  Laptop,
  Menu,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";
import { SpokiLink } from "@/components/bot/spoki-link";

export type BottomNavItem = { href: string; label: string };

/** Asks the one phone menu in the header to open (D468). */
export const OPEN_MENU_EVENT = "intgetion:open-menu";

const ICONS: Record<string, LucideIcon> = {
  "/jobs": Briefcase,
  "/freelance": Laptop,
  "/chat": Bot,
  "/campaigns": Clapperboard,
};

const JOB_PAGE = /^\/jobs\/[0-9a-f-]{36}$/;

const tab =
  "flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight";

/**
 * The phone tab bar for everyone (P-MOBILE, D245, D468): the main services
 * and "More", which opens the full menu. Hidden on a job page, which has its
 * own action bar at the bottom, and on wide screens.
 */
export function BottomNav({
  items,
  label,
  moreLabel,
}: {
  items: BottomNavItem[];
  label: string;
  moreLabel: string;
}) {
  const pathname = usePathname();
  if (JOB_PAGE.test(pathname)) return null;
  return (
    <nav
      aria-label={label}
      data-bottom-nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              {/* Spoki opens over the page when the panel is on (D525). */}
              {item.href === "/chat" ? (
                <SpokiLink
                  aria-current={active ? "page" : undefined}
                  className={cn(tab, active ? "text-fg" : "text-fg-muted")}
                >
                  <Icon icon={Bot} size={20} />
                  <span className="max-w-full truncate">{item.label}</span>
                </SpokiLink>
              ) : (
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(tab, active ? "text-fg" : "text-fg-muted")}
                >
                  <Icon icon={ICONS[item.href] ?? Briefcase} size={20} />
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))}
            className={cn(tab, "text-fg-muted")}
          >
            <Icon icon={Menu} size={20} />
            <span className="max-w-full truncate">{moreLabel}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
