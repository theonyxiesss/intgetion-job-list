import { describe, expect, it } from "vitest";
import { advanceWork, finishWork, type WorkStep } from "./work-progress";

describe("the observed work of a chat turn", () => {
  it("keeps repeated calls to the same tool distinct", () => {
    let steps: WorkStep[] = [];
    steps = advanceWork(steps, {
      type: "tool_start",
      id: "a",
      name: "search_jobs",
    });
    steps = advanceWork(steps, {
      type: "tool_end",
      id: "a",
      status: "completed",
    });
    steps = advanceWork(steps, {
      type: "tool_start",
      id: "b",
      name: "search_jobs",
    });
    expect(steps.map((step) => step.status)).toEqual(["completed", "running"]);
  });

  it("never turns an unconfirmed or interrupted action into success", () => {
    const steps: WorkStep[] = [
      { id: "a", name: "publish", status: "waiting" },
      { id: "b", name: "find_services", status: "running" },
    ];
    expect(finishWork(steps).map((step) => step.status)).toEqual([
      "waiting",
      "unknown",
    ]);
  });

  it("ignores unknown and malformed events", () => {
    expect(
      advanceWork([], { type: "tool_end", id: "a", status: "completed" }),
    ).toEqual([]);
    expect(advanceWork([], { type: "token", text: "hello" })).toEqual([]);
    expect(
      advanceWork([], { type: "tool_start", name: "search_jobs" }),
    ).toEqual([]);
  });
});
