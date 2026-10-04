import { describe, expect, it } from "vitest";
import {
  QUEUE_MAX_ATTEMPTS,
  failureOutcome,
  retryDelayMs,
  runQueue,
  type ClaimedTask,
  type QueueStore,
} from "../service/queue-rules";

type Row = {
  id: string;
  jobId: string;
  /** "waiting" = pending with run_after in the future */
  status: "pending" | "waiting" | "running" | "done" | "failed";
  attempts: number;
};

/** In-memory store with the same claim rule as the SQL: one row, once. */
function memoryStore(rows: Row[]): QueueStore & { rows: Row[] } {
  return {
    rows,
    async claim() {
      const row = rows.find(
        (entry) =>
          entry.status === "pending" && entry.attempts < QUEUE_MAX_ATTEMPTS,
      );
      if (!row) return null;
      row.status = "running";
      row.attempts += 1;
      const task: ClaimedTask = {
        id: row.id,
        jobId: row.jobId,
        attempts: row.attempts,
      };
      return task;
    },
    async complete(id) {
      rows.find((row) => row.id === id)!.status = "done";
    },
    async retry(id) {
      rows.find((row) => row.id === id)!.status = "waiting";
    },
    async fail(id) {
      rows.find((row) => row.id === id)!.status = "failed";
    },
  };
}

function pending(count: number): Row[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `t${index}`,
    jobId: `j${index}`,
    status: "pending" as const,
    attempts: 0,
  }));
}

describe("retry rules", () => {
  it("backs off 1, 2, 4, 8 minutes", () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([
      60_000, 120_000, 240_000, 480_000,
    ]);
  });

  it("gives up after the fifth attempt", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(failureOutcome(4, now)).toEqual({
      status: "pending",
      runAfter: new Date("2026-10-04T12:08:00Z"),
    });
    expect(failureOutcome(QUEUE_MAX_ATTEMPTS, now)).toEqual({
      status: "failed",
    });
  });
});

describe("runQueue", () => {
  it("runs every due task once and stops when the queue is empty", async () => {
    const store = memoryStore(pending(3));
    const computed: string[] = [];
    const result = await runQueue({
      store,
      compute: async (jobId) => {
        computed.push(jobId);
        return { considered: 1, written: 1 };
      },
    });
    expect(computed).toEqual(["j0", "j1", "j2"]);
    expect(result).toEqual({ claimed: 3, done: 3, retried: 0, failed: 0 });
    expect(store.rows.every((row) => row.status === "done")).toBe(true);
  });

  it("puts a failed task back and fails it for good on the last attempt", async () => {
    const rows = pending(2);
    rows[1]!.attempts = QUEUE_MAX_ATTEMPTS - 1;
    const store = memoryStore(rows);
    const result = await runQueue({
      store,
      compute: async () => {
        throw new Error("boom");
      },
    });
    expect(result).toEqual({ claimed: 2, done: 0, retried: 1, failed: 1 });
    expect(rows.map((row) => row.status)).toEqual(["waiting", "failed"]);
  });

  it("splits the work between two parallel runs without doubling it", async () => {
    const store = memoryStore(pending(10));
    const seen: string[] = [];
    const compute = async (jobId: string) => {
      seen.push(jobId);
      await new Promise((resolve) => setTimeout(resolve, 1));
      return { considered: 0, written: 0 };
    };
    const [left, right] = await Promise.all([
      runQueue({ store, compute }),
      runQueue({ store, compute }),
    ]);
    expect(left.claimed + right.claimed).toBe(10);
    expect(new Set(seen).size).toBe(10);
    expect(seen).toHaveLength(10);
  });

  it("stops claiming when the time budget is spent", async () => {
    const store = memoryStore(pending(5));
    let now = 0;
    const result = await runQueue({
      store,
      budgetMs: 100,
      clock: () => new Date(now),
      compute: async () => {
        now += 60;
        return { considered: 0, written: 0 };
      },
    });
    expect(result.claimed).toBe(2);
    expect(store.rows.filter((row) => row.status === "pending")).toHaveLength(
      3,
    );
  });
});
