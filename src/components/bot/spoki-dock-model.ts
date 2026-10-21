/**
 * Plain rules of the persistent Spoki panel (D525): which part of the site
 * the person is on, which thread a `/chat?…` address asks for, and the
 * message namespaces the chat reads. No React here, so tests and the server
 * share it.
 */

import type { PageSection } from "@/config/page-sections";

const SECTION_PREFIXES: readonly [string, PageSection][] = [
  ["/jobs", "jobs"],
  ["/saved-jobs", "jobs"],
  ["/saved-searches", "jobs"],
  ["/matches", "jobs"],
  ["/salaries", "jobs"],
  ["/companies", "jobs"],
  ["/applications", "jobs"],
  ["/employer", "employer"],
  ["/post-job", "employer"],
  ["/for-employers", "employer"],
  ["/campaigns", "ugc"],
  ["/creator", "ugc"],
  ["/freelance", "freelance"],
  ["/events", "events"],
  ["/services", "services"],
  ["/company", "services"],
  ["/account", "account"],
  ["/profile", "account"],
  ["/settings", "account"],
  ["/notifications", "account"],
  ["/billing", "pricing"],
  ["/pricing", "pricing"],
];

const JOB_PAGE = /^\/jobs\/[0-9a-f-]{36}$/i;

/** The section of a path without the locale prefix. */
export function pageSection(pathname: string): PageSection {
  if (JOB_PAGE.test(pathname)) return "job";
  for (const [prefix, section] of SECTION_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`))
      return section;
  }
  return "other";
}

/** The thread the chat shows; the same keys as the `/chat` address. */
export type ChatTarget = {
  job?: string;
  campaign?: string;
  invite?: string;
  service?: string;
  order?: string;
  confirm?: string;
  from?: "services" | "campaigns" | "freelance_sell" | "post_job";
};

const UUID = /^[0-9a-f-]{36}$/i;
const FROM = new Set(["services", "campaigns", "freelance_sell", "post_job"]);

/**
 * The thread a `/chat?…` address asks for, or null when it names none, so a
 * plain `/chat` keeps the thread already open (D525).
 */
export function chatTargetFromParams(
  params: URLSearchParams,
): ChatTarget | null {
  const target: ChatTarget = {};
  for (const key of [
    "job",
    "campaign",
    "invite",
    "service",
    "order",
    "confirm",
  ] as const) {
    const value = params.get(key);
    if (value && UUID.test(value)) target[key] = value;
  }
  const from = params.get("from");
  if (from && FROM.has(from)) target.from = from as ChatTarget["from"];
  return Object.keys(target).length > 0 ? target : null;
}

/** A stable key of a target: a new key means a new thread, so a new chat. */
export function targetKey(target: ChatTarget | null): string {
  if (!target) return "general";
  return Object.entries(target)
    .filter(([, value]) => value !== undefined)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
}

/** `/chat` with the same thread, for links and the full-screen address. */
export function chatHref(target: ChatTarget | null): string {
  if (!target) return "/chat";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(target))
    if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/chat?${query}` : "/chat";
}

/**
 * The namespaces the chat reads: the `/chat` page sends them with
 * RouteMessages, the panel loads them from `/api/bot/messages` (D476, D525).
 */
export const SPOKI_NAMESPACES = [
  "chat",
  "explain",
  "ugc",
  "notifications",
  "notificationSettings",
  "jobs",
  "chatFreelance",
] as const;

/** Cookie with the person's own choice: the panel open or closed (D525). */
export const SPOKI_DOCK_COOKIE = "spoki_dock";
export type DockPreference = "open" | "closed";

export function readDockPreference(
  value: string | undefined,
): DockPreference | null {
  return value === "open" || value === "closed" ? value : null;
}
