import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "./cn";

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
}: {
  label: string;
  items: TabItem[];
}) {
  return (
    <nav aria-label={label} className="border-b border-line">
      <ul className="-mb-px flex gap-6 overflow-x-auto">
        {items.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              aria-current={item.active ? "page" : undefined}
              className={cn(
                "t-nav inline-flex min-h-11 items-center gap-2 border-b-2 whitespace-nowrap transition-colors",
                item.active
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span className="t-data text-fg-subtle">{item.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
