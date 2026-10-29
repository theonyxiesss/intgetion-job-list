/**
 * Left column of the three-column desktop layout (D477). Labels are message
 * keys; hrefs are real routes and match NAV_ICONS. The same for everyone:
 * the account pages are in the account menu, not here (D489).
 */
export type RailLink = { href: string; label: string };
/** Who is looking; the right column (`JobsAside`) still reads it. */
export type RailViewer = "guest" | "candidate" | "employer";

export const railServices: readonly RailLink[] = [
  { href: "/jobs", label: "nav.jobs" },
  { href: "/events", label: "nav.events" },
  { href: "/freelance", label: "nav.freelance" },
  { href: "/freelance/tasks", label: "nav.taskBoard" },
  { href: "/campaigns", label: "nav.campaigns" },
  { href: "/services", label: "nav.services" },
  { href: "/chat", label: "nav.chat" },
];

/**
 * Pages without the rail: the home hero and the chat use the full width.
 * `pathname` is without the locale prefix.
 */
export function railHidden(pathname: string): boolean {
  return (
    pathname === "/" || pathname === "/chat" || pathname.startsWith("/chat/")
  );
}

/** Same section or a page inside it. */
export function railActive(pathname: string, href: string): boolean {
  if (
    href === "/freelance" &&
    (pathname === "/freelance/tasks" ||
      pathname.startsWith("/freelance/tasks/"))
  ) {
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
