"use client";

import { User } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

export type AccountLink = { href: string; label: string };

/**
 * Wide-screen account disclosure (DESIGN.md 8.11). The phone sheet keeps
 * the same destinations; this menu is how they stay reachable once that
 * sheet is hidden.
 */
export function AccountMenu({
  label,
  links,
}: {
  label: string;
  links: readonly AccountLink[];
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
        size="icon"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        icon={<Icon icon={User} />}
      />
      {open ? (
        <nav
          id={panelId}
          aria-label={label}
          className="absolute top-full right-0 z-50 mt-2 flex w-max min-w-56 max-w-72 flex-col rounded-xl border border-line bg-bg p-2"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-md px-3 text-fg hover:bg-surface-2"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-1 border-t border-line pt-2">
            <LogoutButton />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
