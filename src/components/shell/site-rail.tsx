"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";
import { Link, usePathname } from "@/i18n/navigation";
import { iconForNav, type NavMark } from "./nav-icons";
import { railActive, railHidden } from "./rail-items";
import { SpokiLink } from "@/components/bot/spoki-link";

export type SiteRailLink = { href: string; label: string };
export type SiteRailData = {
  label: string;
  sectionsTitle: string;
  categoriesTitle: string;
  collapse: string;
  expand: string;
  services: SiteRailLink[];
  categories: { id: string; label: string }[];
};

const item =
  "flex min-h-12 items-center gap-3 rounded-md px-3 text-base transition-colors hover:bg-surface hover:text-fg";
const COLLAPSED_KEY = "site_rail_collapsed";
let volatileCollapsed = false;

function getCollapsed() {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return volatileCollapsed;
  }
}

function setCollapsed(collapsed: boolean) {
  volatileCollapsed = collapsed;
  try {
    window.localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Collapsing stays for this page when storage is unavailable.
  }
  window.dispatchEvent(new Event("site-rail-collapsed"));
}

function subscribeCollapsed(onChange: () => void) {
  window.addEventListener("site-rail-collapsed", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener("site-rail-collapsed", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function Group({
  id,
  title,
  collapsed,
  children,
}: {
  id: string;
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div role="group" aria-labelledby={id} className="flex flex-col gap-1">
      <p
        id={id}
        className={cn(
          "t-label px-3 pb-1 text-fg-muted",
          collapsed && "sr-only",
        )}
      >
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
  collapsed = false,
  mark: Mark,
}: SiteRailLink & { active: boolean; collapsed?: boolean; mark?: NavMark }) {
  const body = (
    <>
      {Mark ? <Mark size={24} className="shrink-0" /> : null}
      <span className={cn("truncate", collapsed && "sr-only")}>{label}</span>
    </>
  );
  const className = cn(
    item,
    collapsed && "justify-center px-0",
    active ? "bg-surface text-fg" : "text-fg-muted",
  );
  return (
    <li>
      {/* Spoki opens beside the page when the panel is on (D525). */}
      {href === "/chat" ? (
        <SpokiLink
          aria-current={active ? "page" : undefined}
          className={className}
          title={collapsed ? label : undefined}
        >
          {body}
        </SpokiLink>
      ) : (
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={className}
          title={collapsed ? label : undefined}
        >
          {body}
        </Link>
      )}
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
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    getCollapsed,
    () => false,
  );
  if (railHidden(pathname)) return null;
  const onCatalog = pathname === "/jobs";
  const toggle = collapsed ? data.expand : data.collapse;
  return (
    <aside
      data-rail
      data-collapsed={collapsed ? "" : undefined}
      className={cn(
        "hidden self-stretch pt-10 md:pt-16 xl:block",
        collapsed ? "pl-8" : "pl-12",
      )}
    >
      <nav
        aria-label={data.label}
        className="sticky top-24 flex max-h-[calc(100vh-8rem)] flex-col gap-6 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={toggle}
          aria-expanded={!collapsed}
          title={toggle}
          className={cn(
            "inline-flex size-11 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            collapsed ? "self-center" : "self-end",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen size={20} />
          ) : (
            <PanelLeftClose size={20} />
          )}
        </button>
        <Group
          id="rail-sections"
          title={data.sectionsTitle}
          collapsed={collapsed}
        >
          {data.services.map((link) => (
            <RailItem
              key={link.href}
              {...link}
              active={railActive(pathname, link.href)}
              collapsed={collapsed}
              mark={iconForNav(link.href)}
            />
          ))}
        </Group>
        {collapsed ? null : (
          <Group
            id="rail-categories"
            title={data.categoriesTitle}
            collapsed={false}
          >
            <Suspense
              fallback={<Categories items={data.categories} current={null} />}
            >
              <CategoriesFromUrl
                items={data.categories}
                onCatalog={onCatalog}
              />
            </Suspense>
          </Group>
        )}
      </nav>
    </aside>
  );
}
