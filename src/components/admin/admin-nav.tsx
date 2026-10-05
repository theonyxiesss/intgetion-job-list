"use client";

import {
  Briefcase,
  ChartColumn,
  Download,
  Flag,
  LayoutGrid,
  ListChecks,
  ScrollText,
  SlidersHorizontal,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AdminIconName } from "@/admin/registry";
import { Icon, Select, cn, navFade } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";

const icons: Record<AdminIconName, LucideIcon> = {
  "layout-grid": LayoutGrid,
  "list-checks": ListChecks,
  flag: Flag,
  briefcase: Briefcase,
  users: Users,
  download: Download,
  tags: Tags,
  "scroll-text": ScrollText,
  "chart-column": ChartColumn,
  sliders: SlidersHorizontal,
};

export type AdminNavItem = {
  key: string;
  href: string;
  label: string;
  icon: AdminIconName;
  count?: number;
  current: boolean;
};

export function AdminNav({
  label,
  title,
  items,
}: {
  label: string;
  title: string;
  items: AdminNavItem[];
}) {
  const router = useRouter();
  const current =
    items.find((item) => item.current)?.href ?? items[0]?.href ?? "/admin";

  return (
    <nav aria-label={label} className="lg:w-[220px] lg:shrink-0">
      <p className="t-label mb-3 hidden text-fg-subtle lg:block">{title}</p>
      <div className="lg:hidden">
        <Select
          aria-label={label}
          value={current}
          onChange={(event) => router.push(event.target.value)}
        >
          {items.map((item) => (
            <option key={item.key} value={item.href}>
              {item.count ? `${item.label} (${item.count})` : item.label}
            </option>
          ))}
        </Select>
      </div>
      <ul className="hidden lg:flex lg:flex-col lg:border-l lg:border-line">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              {...navFade}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "t-nav flex min-h-11 items-center gap-3 px-3 transition-colors duration-[120ms] lg:-ml-px lg:border-l-2 lg:pl-4",
                item.current
                  ? "border-accent text-fg"
                  : "border-transparent text-fg-muted hover:text-fg",
              )}
            >
              <Icon icon={icons[item.icon]} size={16} />
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.count !== undefined && item.count > 0 && (
                <span className="t-data text-signal">{item.count}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
