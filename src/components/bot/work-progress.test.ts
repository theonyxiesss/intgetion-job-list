import { describe, expect, it } from "vitest";
import {
  advanceWork,
  finishWork,
  workSeconds,
  type WorkStep,
} from "./work-progress";

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

describe("step time and summary (TZ 36, task A)", () => {
  it("keeps a checked summary and the time of a completed step only", () => {
    let steps = advanceWork([], {
      type: "tool_start",
      id: "a",
      name: "search_jobs",
    });
    steps = advanceWork(steps, {
      type: "tool_end",
      id: "a",
      status: "completed",
      ms: 1234,
      summary: { kind: "jobs", count: 5, category: "design", q: "x" },
    });
    expect(steps[0]).toEqual({
      id: "a",
      name: "search_jobs",
      status: "completed",
      ms: 1234,
      summary: { kind: "jobs", count: 5, category: "design" },
    });
    const failed = advanceWork(
      advanceWork([], { type: "tool_start", id: "b", name: "search_jobs" }),
      {
        type: "tool_end",
        id: "b",
        status: "failed",
        ms: -5,
        summary: { kind: "jobs", count: 1 },
      },
    );
    expect(failed[0]).toEqual({
      id: "b",
      name: "search_jobs",
      status: "failed",
    });
  });

  it("adds up the turn's tool time in whole seconds", () => {
    expect(workSeconds([])).toBeNull();
    expect(
      workSeconds([
        { id: "a", name: "x", status: "completed", ms: 1200 },
        { id: "b", name: "y", status: "completed", ms: 4900 },
      ]),
    ).toBe(6);
  });
});
