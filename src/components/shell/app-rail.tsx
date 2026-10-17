import { getTranslations } from "next-intl/server";
import { cn } from "@/components/ui/cn";
import { JOB_CATEGORIES } from "@/config/markers";
import { Link } from "@/i18n/navigation";
import { iconForNav, type NavMark } from "./nav-icons";
import {
  railMine,
  railServices,
  type RailLink,
  type RailViewer,
} from "./rail-items";

const item =
  "flex min-h-10 items-center gap-3 rounded-md px-3 text-[14px] transition-colors hover:bg-surface hover:text-fg";

function Group({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
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
}: RailLink & {
  active: boolean;
  mark?: NavMark;
}) {
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

/**
 * Left column from 1280 px (D477): services, job categories and the
 * person's own pages. Server-rendered, no client code; below 1280 the header
 * menu and the phone tab bar are the way around.
 */
export async function AppRail({
  current,
  category,
  viewer,
}: {
  /** The service this page belongs to, e.g. "/jobs". */
  current: string;
  /** The category filter in force on the catalog, if any. */
  category?: string;
  viewer: RailViewer;
}) {
  const t = await getTranslations();
  const categories = await getTranslations("categories");
  const mine = railMine(viewer);
  return (
    <aside className="hidden self-stretch xl:block">
      <nav
        aria-label={t("nav.rail")}
        className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col gap-6 overflow-y-auto pb-4 [scrollbar-color:var(--line-strong)_transparent] [scrollbar-width:thin]"
      >
        <Group id="rail-sections" title={t("nav.railSections")}>
          {railServices.map((link) => (
            <RailItem
              key={link.href}
              href={link.href}
              label={t(link.label)}
              active={link.href === current && !category}
              mark={iconForNav(link.href)}
            />
          ))}
        </Group>
        <Group id="rail-categories" title={t("nav.railCategories")}>
          {JOB_CATEGORIES.map((id) => (
            <RailItem
              key={id}
              href={`/jobs?category=${id}`}
              label={categories(id)}
              active={current === "/jobs" && category === id}
            />
          ))}
        </Group>
        {mine.length > 0 ? (
          <Group id="rail-mine" title={t("nav.railMine")}>
            {mine.map((link) => (
              <RailItem
                key={link.href}
                href={link.href}
                label={t(link.label)}
                active={link.href === current}
                mark={iconForNav(link.href)}
              />
            ))}
          </Group>
        ) : null}
      </nav>
    </aside>
  );
}
