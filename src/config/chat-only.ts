/**
 * TZ 53: the chat is the platform. With CHAT_ONLY=true the cabinet pages
 * open the chat home instead, doing there what the page did: a question to
 * Spoki, a panel, or the sign-in window. Public pages search engines index
 * (jobs, companies, events, freelance, salaries), the pay page, legal texts,
 * sign-in callbacks, `/chat` and the admin stay as they are.
 */

export const CHAT_OPEN_ACTIONS = [
  "applications",
  "saved",
  "savedSearches",
  "jobs",
  "inbox",
  "settings",
  "plans",
  "postJob",
  "myJobs",
  "ugc",
  "profile",
  "signin",
  "signup",
  "account",
  "assistants",
  "billing",
] as const;

export type ChatOpen = (typeof CHAT_OPEN_ACTIONS)[number];

/** Path prefix → action; the longest matching prefix wins. */
const RULES: readonly [string, ChatOpen][] = [
  ["/applications", "applications"],
  ["/saved-jobs", "saved"],
  ["/saved-searches", "savedSearches"],
  ["/matches", "jobs"],
  ["/notifications", "inbox"],
  ["/settings/account", "account"],
  ["/settings/privacy", "account"],
  ["/settings/assistants", "assistants"],
  ["/settings", "settings"],
  ["/account", "profile"],
  ["/profile", "profile"],
  ["/onboarding", "profile"],
  ["/portfolio", "profile"],
  ["/pricing", "plans"],
  ["/post-job", "postJob"],
  ["/for-employers", "postJob"],
  ["/employer", "myJobs"],
  ["/campaigns", "ugc"],
  ["/creator", "ugc"],
  ["/login", "signin"],
  ["/register", "signup"],
];

/** Exact paths only: the pay page under `/billing` keeps working. */
const EXACT: readonly [string, ChatOpen][] = [["/billing", "billing"]];

export function isChatOpen(value: string | null): value is ChatOpen {
  return (CHAT_OPEN_ACTIONS as readonly string[]).includes(value ?? "");
}

/** What the chat home does for a path without its locale prefix, if any. */
export function chatOnlyTarget(path: string): ChatOpen | null {
  const clean = path.replace(/\/+$/, "") || "/";
  for (const [exact, action] of EXACT) if (clean === exact) return action;
  let best: [string, ChatOpen] | null = null;
  for (const rule of RULES) {
    const [prefix] = rule;
    if (clean === prefix || clean.startsWith(`${prefix}/`)) {
      if (!best || prefix.length > best[0].length) best = rule;
    }
  }
  return best ? best[1] : null;
}
