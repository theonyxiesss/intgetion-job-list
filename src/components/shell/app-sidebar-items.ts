/**
 * Items of the v2 side menu (UI_V2). Labels are message keys, hrefs are real
 * routes. A group opens in place; its own href is the first child.
 */
export type SidebarLink = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = SidebarLink & {
  children: readonly { href: string; label: string }[];
};
export type SidebarItem = SidebarLink | SidebarGroup;

export type SidebarIcon =
  | "jobs"
  | "freelance"
  | "ugc"
  | "turnkey"
  | "events"
  | "bell"
  | "profile"
  | "pricing"
  | "finance"
  | "history";

export const sidebarItems: readonly SidebarItem[] = [
  { href: "/chat/history", label: "nav.chatHistory", icon: "history" },
  {
    href: "/jobs",
    label: "nav.jobs",
    icon: "jobs",
    children: [
      { href: "/jobs", label: "nav.findJobs" },
      { href: "/post-job", label: "nav.postJob" },
      { href: "/employer/jobs", label: "nav.myJobs" },
    ],
  },
  {
    href: "/freelance",
    label: "nav.freelance",
    icon: "freelance",
    children: [
      { href: "/freelance", label: "nav.freelance" },
      { href: "/freelance/tasks", label: "nav.taskBoard" },
    ],
  },
  { href: "/campaigns", label: "nav.campaigns", icon: "ugc" },
  { href: "/services", label: "nav.turnkey", icon: "turnkey" },
  { href: "/notifications", label: "nav.notifications", icon: "bell" },
  { href: "/events", label: "nav.eventsList", icon: "events" },
  { href: "/profile", label: "nav.profile", icon: "profile" },
  { href: "/pricing", label: "nav.pricing", icon: "pricing" },
  {
    href: "/employer/billing",
    label: "nav.finance",
    icon: "finance",
    children: [
      { href: "/employer/billing", label: "nav.payments" },
      { href: "/billing/crypto", label: "nav.cryptoWallet" },
    ],
  },
];

export function isGroup(item: SidebarItem): item is SidebarGroup {
  return "children" in item;
}

/** Same page or a page inside it; `pathname` is without the locale prefix. */
export function sidebarActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A group is open when the person is on one of its pages. */
export function groupActive(pathname: string, group: SidebarGroup): boolean {
  return group.children.some((child) => sidebarActive(pathname, child.href));
}

/** Every message key the menu needs, so the layout can resolve them on the server. */
export function sidebarLabelKeys(): string[] {
  const keys = new Set<string>([
    "nav.newChat",
    "nav.sections",
    "nav.recentChats",
    "nav.allChats",
    "nav.settings",
    "nav.account",
    "nav.login",
    "nav.rail",
    "nav.chat",
    "product.wordmark",
  ]);
  for (const item of sidebarItems) {
    keys.add(item.label);
    if (isGroup(item)) for (const child of item.children) keys.add(child.label);
  }
  return [...keys];
}
