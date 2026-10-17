/**
 * Left column of the three-column desktop layout (D477). Labels are message
 * keys; hrefs are real routes and match NAV_ICONS. Who is looking decides
 * the account group only; the services are the same for everyone.
 */
export type RailViewer = "guest" | "candidate" | "employer";
export type RailLink = { href: string; label: string };

export const railServices: readonly RailLink[] = [
  { href: "/jobs", label: "nav.jobs" },
  { href: "/events", label: "nav.events" },
  { href: "/freelance", label: "nav.freelance" },
  { href: "/campaigns", label: "nav.campaigns" },
  { href: "/services", label: "nav.services" },
  { href: "/chat", label: "nav.chat" },
];

export function railMine(viewer: RailViewer): readonly RailLink[] {
  if (viewer === "employer")
    return [
      { href: "/employer/jobs", label: "nav.myJobs" },
      { href: "/employer/company", label: "nav.company" },
      { href: "/employer/billing", label: "billing.nav" },
    ];
  if (viewer === "candidate")
    return [
      { href: "/profile", label: "profile.nav" },
      { href: "/applications", label: "applications.nav" },
      { href: "/saved-jobs", label: "nav.saved" },
    ];
  return [];
}
