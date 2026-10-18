/**
 * What the web chat says while Spoki works (D490). The words are English in
 * every locale on purpose; they are message keys under `chat.status`.
 */

/** Words that take turns while Spoki thinks without a tool. */
export const IDLE_STEPS = [
  "thinking",
  "pondering",
  "considering",
  "mulling",
] as const;

export type IdleStep = (typeof IDLE_STEPS)[number];
export type ToolStep =
  | "searchJobs"
  | "readJob"
  | "events"
  | "services"
  | "account"
  | "memory"
  | "ugc"
  | "working";
export type StatusStep = IdleStep | ToolStep;

/** How long one idle word stays before the next. */
export const IDLE_STEP_MS = 2400;

const TOOL_STEPS: Record<string, ToolStep> = {
  search_jobs: "searchJobs",
  get_matches: "searchJobs",
  published_demand: "searchJobs",
  get_job: "readJob",
  find_events: "events",
  find_services: "services",
  get_service: "services",
  freelance_price_range: "services",
  get_my_profile: "account",
  get_my_standing: "account",
  get_my_applications: "account",
  get_my_services: "account",
  get_my_orders: "account",
  get_order: "account",
  get_my_creator_profile: "account",
  remember_fact: "memory",
  forget_fact: "memory",
};

/** The step shown for a running tool; unknown tools read as "working". */
export function stepForTool(name: string): ToolStep {
  return TOOL_STEPS[name] ?? (name.includes("ugc") ? "ugc" : "working");
}

/** The idle word for this much waiting, in turn and round again. */
export function idleStep(elapsedMs: number): IdleStep {
  const turn = Math.floor(Math.max(0, elapsedMs) / IDLE_STEP_MS);
  return IDLE_STEPS[turn % IDLE_STEPS.length]!;
}

/** Whole seconds, shown only once the wait is noticeable. */
export function elapsedLabel(elapsedMs: number): string | null {
  const seconds = Math.floor(elapsedMs / 1000);
  return seconds >= 2 ? `${seconds}s` : null;
}
