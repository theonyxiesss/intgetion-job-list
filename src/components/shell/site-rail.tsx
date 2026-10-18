"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";
import { iconForNav, type NavMark } from "./nav-icons";
import { railActive, railHidden } from "./rail-items";

export type SiteRailLink = { href: string; label: string };
export type SiteRailData = {
  label: string;
  sectionsTitle: string;
  categoriesTitle: string;
  services: SiteRailLink[];
  categories: { id: string; label: string }[];
};

const item =
  "flex min-h-11 items-center gap-3 rounded-md px-3 text-[15px] transition-colors hover:bg-surface hover:text-fg";

function Group({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1">
      <p id={id} className="t-label px-3 pb-1 text-fg-muted">
        {title}
      </p>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </div>
  );
}

function RailItem({
  href,
  label,
  active,
  mark: Mark,
}: SiteRailLink & { active: boolean; mark?: NavMark }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(item, active ? "bg-surface text-fg" : "text-fg-muted")}
      >
        {Mark ? <Mark size={20} className="shrink-0" /> : null}
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );
}

function Categories({
  items,
  current,
}: {
  items: SiteRailData["categories"];
  current: string | null;
}) {
  return items.map((category) => (
    <RailItem
      key={category.id}
      href={`/jobs?category=${category.id}`}
      label={category.label}
      active={current === category.id}
    />
  ));
}

function CategoriesFromUrl({
  items,
  onCatalog,
}: {
  items: SiteRailData["categories"];
  onCatalog: boolean;
}) {
  const category = useSearchParams().get("category");
  return <Categories items={items} current={onCatalog ? category : null} />;
}

/**
 * The left column from 1280 px (D477). It lives in the layout, so a click
 * inside it changes only the page: the column, its scroll position and its
 * place stay. Only the highlight follows the address. Sections and job
 * categories only: the account pages live in the account menu (D489).
 */
export function SiteRail({ data }: { data: SiteRailData }) {
  const pathname = usePathname();
  if (railHidden(pathname)) return null;
  const onCatalog = pathname === "/jobs";
  return (
    <aside
      data-rail
      className="hidden self-stretch pt-10 pl-12 md:pt-16 xl:block"
    >
      <nav
        aria-label={data.label}
        className="sticky top-24 flex max-h-[calc(100vh-8rem)] flex-col gap-6 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <Group id="rail-sections" title={data.sectionsTitle}>
          {data.services.map((link) => (
            <RailItem
              key={link.href}
              {...link}
              active={railActive(pathname, link.href)}
              mark={iconForNav(link.href)}
            />
          ))}
        </Group>
        <Group id="rail-categories" title={data.categoriesTitle}>
          <Suspense
            fallback={<Categories items={data.categories} current={null} />}
          >
            <CategoriesFromUrl items={data.categories} onCatalog={onCatalog} />
          </Suspense>
        </Group>
      </nav>
    </aside>
  );
}
