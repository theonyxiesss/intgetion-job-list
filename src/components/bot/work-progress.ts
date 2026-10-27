import { checkStep, type StepSummary } from "@/modules/bot/ui/step-summary";

export type WorkStatus =
  "running" | "completed" | "waiting" | "blocked" | "failed" | "unknown";
export type WorkStep = {
  id: string;
  name: string;
  status: WorkStatus;
  /** How long the step took, from the server (TZ 36, task A). */
  ms?: number;
  /** What the step did, checked again here before it is drawn. */
  summary?: StepSummary;
};
export type WorkState = "running" | "done" | "failed" | "stopped";

const END_STATUSES = new Set(["completed", "waiting", "blocked", "failed"]);
const MAX_STEP_MS = 10 * 60 * 1000;

/** Only server events establish success; a closed connection never does. */
export function advanceWork(
  steps: WorkStep[],
  event: Record<string, unknown>,
): WorkStep[] {
  if (typeof event.id !== "string") return steps;
  if (event.type === "tool_start" && typeof event.name === "string") {
    if (steps.some((step) => step.id === event.id)) return steps;
    return [...steps, { id: event.id, name: event.name, status: "running" }];
  }
  if (
    event.type === "tool_end" &&
    typeof event.status === "string" &&
    END_STATUSES.has(event.status)
  ) {
    const ms =
      Number.isInteger(event.ms) &&
      (event.ms as number) >= 0 &&
      (event.ms as number) <= MAX_STEP_MS
        ? (event.ms as number)
        : undefined;
    const summary =
      event.status === "completed" ? checkStep(event.summary) : undefined;
    return steps.map((step) =>
      step.id === event.id
        ? {
            ...step,
            status: event.status as WorkStatus,
            ...(ms === undefined ? {} : { ms }),
            ...(summary ? { summary } : {}),
          }
        : step,
    );
  }
  return steps;
}

export function finishWork(steps: WorkStep[]): WorkStep[] {
  return steps.map((step) =>
    step.status === "running" ? { ...step, status: "unknown" } : step,
  );
}

/** The whole turn's tool time, for the folded line ("3 steps · 6 s"). */
export function workSeconds(steps: readonly WorkStep[]): number | null {
  const timed = steps.filter((step) => step.ms !== undefined);
  if (timed.length === 0) return null;
  const total = timed.reduce((sum, step) => sum + (step.ms ?? 0), 0);
  return Math.max(1, Math.round(total / 1000));
}
