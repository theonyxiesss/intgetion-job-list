"use client";

import { Menu, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { navFade } from "@/components/ui/page-transition";
import { Link, usePathname } from "@/i18n/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { OPEN_MENU_EVENT } from "./bottom-nav";
import { LocaleSwitch } from "./locale-switch";
import { iconForNav } from "./nav-icons";
import { railHidden } from "./rail-items";
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
  triggerClassName = "xl:hidden",
  railessTriggerClassName,
}: {
  items: NavItem[];
  label: string;
  openLabel: string;
  closeLabel: string;
  signedIn: boolean;
  /** When the left rail takes over. Defaults to the xl breakpoint. */
  triggerClassName?: string;
  /** Used instead on pages without the rail (home, chat): the menu is then
   * the only way to the sections at any width (D488). */
  railessTriggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const trigger =
    railessTriggerClassName !== undefined && railHidden(pathname)
      ? railessTriggerClassName
      : triggerClassName;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // "More" in the phone tab bar opens this same menu (D468).
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, show);
    return () => window.removeEventListener(OPEN_MENU_EVENT, show);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={openLabel}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        icon={<Icon icon={Menu} />}
        className={trigger}
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
          {items.map((item, i) => {
            const Mark = iconForNav(item.href);
            return (
              <Link
                {...navFade}
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                data-i={Math.min(i, 5)}
                className="t-h2 ui-menu-item flex min-h-14 items-center overflow-hidden border-b border-line text-[clamp(20px,6.5vw,28px)] whitespace-nowrap"
              >
                <span className="inline-flex min-w-0 items-center gap-4">
                  {Mark ? <Mark size={24} className="shrink-0" /> : null}
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 px-4">
          <ThemeToggle />
          {signedIn && <LogoutButton />}
        </div>
        {/* The phone has no footer (D470): the language switch is here. */}
        <div className="px-4 pt-6">
          <Suspense fallback={null}>
            <LocaleSwitch />
          </Suspense>
        </div>
      </dialog>
    </>
  );
}
