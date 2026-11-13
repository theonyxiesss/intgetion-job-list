/**
 * Items of the v2 side menu (UI_V2). Labels are message keys, hrefs are real
 * routes. A group opens in place; its own href is the first child.
 */
export type SidebarLink = { href: string; label: string; icon: SidebarIcon };
export type SidebarGroup = SidebarLink & {
  /** `hint` is the grey line under a flyout item; `action` sits on top. */
  children: readonly {
    href: string;
    label: string;
    hint?: string;
    action?: boolean;
  }[];
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
  | "history"
  | "messages";

export const sidebarItems: readonly SidebarItem[] = [
  { href: "/chat/history", label: "nav.chatHistory", icon: "history" },
  {
    href: "/jobs",
    label: "nav.jobs",
    icon: "jobs",
    children: [
      { href: "/post-job", label: "nav.postJob", action: true },
      { href: "/employer/jobs", label: "nav.hiring", hint: "nav.hint.hiring" },
      { href: "/jobs", label: "nav.findJobs", hint: "nav.hint.findJobs" },
    ],
  },
  {
    href: "/freelance",
    label: "nav.freelance",
    icon: "freelance",
    children: [
      {
        href: "/freelance",
        label: "nav.freelance",
        hint: "nav.hint.freelance",
      },
      {
        href: "/freelance/tasks",
        label: "nav.taskBoard",
        hint: "nav.hint.taskBoard",
      },
    ],
  },
  { href: "/campaigns", label: "nav.campaigns", icon: "ugc" },
  { href: "/services", label: "nav.turnkey", icon: "turnkey" },
  { href: "/messages", label: "nav.inbox", icon: "messages" },
  { href: "/notifications", label: "nav.notifications", icon: "bell" },
  { href: "/events", label: "nav.eventsList", icon: "events" },
  { href: "/profile", label: "nav.profile", icon: "profile" },
  { href: "/pricing", label: "nav.pricing", icon: "pricing" },
  {
    href: "/employer/billing",
    label: "nav.finance",
    icon: "finance",
    children: [
      {
        href: "/employer/billing",
        label: "nav.payments",
        hint: "nav.hint.payments",
      },
      {
        href: "/billing/crypto",
        label: "nav.cryptoWallet",
        hint: "nav.hint.cryptoWallet",
      },
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
    "nav.hiring",
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
    if (isGroup(item))
      for (const child of item.children) {
        keys.add(child.label);
        if (child.hint) keys.add(child.hint);
      }
  }
  return [...keys];
}
