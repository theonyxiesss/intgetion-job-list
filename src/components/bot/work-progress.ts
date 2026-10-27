export type WorkStatus =
  "running" | "completed" | "waiting" | "blocked" | "failed" | "unknown";
export type WorkStep = { id: string; name: string; status: WorkStatus };
export type WorkState = "running" | "done" | "failed" | "stopped";

const END_STATUSES = new Set(["completed", "waiting", "blocked", "failed"]);

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
    return steps.map((step) =>
      step.id === event.id
        ? { ...step, status: event.status as WorkStatus }
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
