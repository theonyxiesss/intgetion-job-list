"use client";

import {
  Bell,
  Bookmark,
  Briefcase,
  Building2,
  ChartColumn,
  Check,
  ChevronDown,
  Settings,
  Shield,
  User,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

export type AccountLink = { href: string; label: string };

const LINK_ICONS: Record<string, LucideIcon | undefined> = {
  "/profile": User,
  "/applications": Check,
  "/saved-jobs": Bookmark,
  "/notifications": Bell,
  "/settings/account": Settings,
  "/admin": Shield,
  "/admin/metrics": ChartColumn,
  "/employer/jobs": Briefcase,
  "/employer/company": Building2,
};

/**
 * Wide-screen account disclosure (DESIGN.md 8.11). The phone sheet keeps
 * the same destinations; this menu is how they stay reachable once that
 * sheet is hidden.
 */
export function AccountMenu({
  label,
  links,
  name,
  email,
}: {
  label: string;
  links: readonly AccountLink[];
  name: string;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      root.current?.querySelector("button")?.focus();
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Button
        variant="ghost"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 gap-1 rounded-full border-line! px-3! text-fg!"
      >
        <Icon icon={User} />
        <Icon
          icon={ChevronDown}
          size={16}
          className={
            open
              ? "rotate-180 transition-transform duration-200 motion-reduce:transition-none"
              : "transition-transform duration-200 motion-reduce:transition-none"
          }
        />
      </Button>
      {open ? (
        <nav
          id={panelId}
          aria-label={label}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-bg p-2"
        >
          {name || email ? (
            <div className="flex flex-col gap-0.5 px-3 py-2">
              {name && name !== email ? (
                <p className="text-fg">{name}</p>
              ) : null}
              {email ? (
                <p className="break-all text-fg-muted">{email}</p>
              ) : null}
              {!email && name ? <p className="text-fg">{name}</p> : null}
            </div>
          ) : null}
          {links.map((link) => {
            const glyph = LINK_ICONS[link.href];
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center gap-2 rounded-md px-3 text-fg hover:bg-surface-2"
              >
                {glyph ? <Icon icon={glyph} /> : null}
                {link.label}
              </Link>
            );
          })}
          <LogoutButton row />
        </nav>
      ) : null}
    </div>
  );
}
