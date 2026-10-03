"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Icon, navFade } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

export type NavItem = { href: string; label: string };

/**
 * Full-screen menu below lg (DESIGN.md 8.11). Built on <dialog>, so focus
 * is trapped and Esc closes it; following a link closes it too.
 */
export function MobileNav({
  items,
  label,
  openLabel,
  closeLabel,
  signedIn,
}: {
  items: NavItem[];
  label: string;
  openLabel: string;
  closeLabel: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={openLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        icon={<Icon icon={Menu} />}
        className="lg:hidden"
      />
      <dialog
        ref={ref}
        aria-label={label}
        onClose={() => setOpen(false)}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-bg p-0 text-fg backdrop:bg-bg"
      >
        <div className="flex h-16 items-center justify-end border-b border-line px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            onClick={() => setOpen(false)}
            icon={<Icon icon={X} />}
          />
        </div>
        <nav aria-label={label} className="flex flex-col px-4 py-6">
          {items.map((item, i) => (
            <Link
              {...navFade}
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              data-i={Math.min(i, 5)}
              className="t-h2 ui-menu-item flex min-h-14 items-center border-b border-line"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 px-4">
          <LocaleSwitch />
          <ThemeToggle />
          {signedIn && <LogoutButton />}
        </div>
      </dialog>
    </>
  );
}
