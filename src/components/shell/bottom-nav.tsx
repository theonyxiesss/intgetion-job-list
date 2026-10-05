"use client";

import {
  Briefcase,
  FileText,
  MessageCircle,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";

export type BottomNavItem = { href: string; label: string };

const ICONS: Record<string, LucideIcon> = {
  "/jobs": Briefcase,
  "/matches": Sparkles,
  "/applications": FileText,
  "/chat": MessageCircle,
  "/profile": UserRound,
};

const JOB_PAGE = /^\/jobs\/[0-9a-f-]{36}$/;

/**
 * Candidate's tab bar on phones (P-MOBILE, D245). Hidden on a job page,
 * which has its own action bar at the bottom, and on wide screens.
 */
export function BottomNav({
  items,
  label,
}: {
  items: BottomNavItem[];
  label: string;
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
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-tight",
                  active ? "text-fg" : "text-fg-muted",
                )}
              >
                <Icon icon={ICONS[item.href] ?? Briefcase} size={20} />
                <span className="max-w-full truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
