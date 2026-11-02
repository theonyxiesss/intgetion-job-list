"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/navigation";

export type HeaderMenuGroup =
  | { label: string; href: string }
  | { label: string; links: readonly { href: string; label: string }[] };

const trigger =
  "t-nav inline-flex min-h-11 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-fg-muted transition-colors hover:text-fg aria-expanded:text-fg";

/**
 * Top bar sections with dropdowns (D592). Click or hover opens a group;
 * Esc or a click outside closes it and Esc returns focus to the trigger.
 */
export function HeaderMenu({
  label,
  groups,
}: {
  label: string;
  groups: readonly HeaderMenuGroup[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  const root = useRef<HTMLElement>(null);
  const baseId = useId();

  useEffect(() => {
    if (open === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-menu-trigger="${open}"]`)
        ?.focus();
      setOpen(null);
    }
    function onPointer(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <nav
      ref={root}
      aria-label={label}
      className="flex min-w-0 items-center gap-1 2xl:gap-3"
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(null);
      }}
    >
      {groups.map((group, index) => {
        if ("href" in group) {
          return (
            <Link key={group.href} href={group.href} className={trigger}>
              {group.label}
            </Link>
          );
        }
        const panelId = `${baseId}-${index}`;
        const isOpen = open === index;
        return (
          <div
            key={group.label}
            className="relative"
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setOpen(index);
            }}
          >
            <button
              type="button"
              data-menu-trigger={index}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpen(isOpen ? null : index)}
              className={trigger}
            >
              {group.label}
              <Icon
                icon={ChevronDown}
                size={16}
                className={
                  isOpen
                    ? "rotate-180 transition-transform duration-200 motion-reduce:transition-none"
                    : "transition-transform duration-200 motion-reduce:transition-none"
                }
              />
            </button>
            {isOpen ? (
              // pt-2 keeps the hover path from the trigger to the panel unbroken.
              <div id={panelId} className="absolute left-0 top-full z-50 pt-2">
                <ul className="w-64 rounded-xl border border-line bg-bg p-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setOpen(null)}
                        className="flex min-h-11 items-center rounded-md px-3 text-fg hover:bg-surface-2"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
