import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";
import { Morph, navFade } from "./page-transition";

export type TabItem = {
  label: string;
  href: ComponentProps<typeof Link>["href"];
  active: boolean;
  count?: number;
};

/**
 * Link tabs (DESIGN.md 8.7): each tab is a URL, so they work without JS and
 * keep their state in the address. Active tab — 2 px line under it.
 */
export function LinkTabs({
  label,
  items,
  indicatorName = "tab-indicator",
}: {
  label: string;
  items: TabItem[];
  /** Unique per tab group on a page; the underline morphs under it. */
  indicatorName?: string;
}) {
  return (
    <nav
      aria-label={label}
      className="border-b border-line in-data-[ui=v2]:self-start in-data-[ui=v2]:max-w-full in-data-[ui=v2]:rounded-xl in-data-[ui=v2]:border in-data-[ui=v2]:bg-surface-2 in-data-[ui=v2]:p-1"
    >
      <ul className="-mb-px flex gap-6 overflow-x-auto in-data-[ui=v2]:mb-0 in-data-[ui=v2]:gap-1">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              {...navFade}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "t-nav relative inline-flex min-h-11 items-center gap-2 whitespace-nowrap transition-colors duration-[120ms] in-data-[ui=v2]:min-h-9 in-data-[ui=v2]:rounded-lg in-data-[ui=v2]:px-3 in-data-[ui=v2]:text-sm in-data-[ui=v2]:font-medium",
                item.active
                  ? "text-fg in-data-[ui=v2]:bg-surface"
                  : "text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="t-data text-fg-muted">{item.count}</span>
              )}
              {item.active && (
                <Morph name={indicatorName}>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-accent in-data-[ui=v2]:hidden"
                  />
                </Morph>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
