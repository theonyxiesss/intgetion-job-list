import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UiBlock } from "../ui/types";

/** D523: a button on a block runs only what the server kept, for its owner. */

const JOB = "11111111-1111-4111-8111-111111111111";
const BLOCK = "55555555-5555-4555-8555-555555555555";
const USER = "44444444-4444-4444-8444-444444444444";
const NOW = new Date("2026-10-24T10:00:00Z");

const runToolMock = vi.hoisted(() => vi.fn());
const findBlockRowMock = vi.hoisted(() => vi.fn());
const updateBlockRowMock = vi.hoisted(() => vi.fn());
const insertMessageMock = vi.hoisted(() => vi.fn());
const journalMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/rate-limit", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/rate-limit")>(
      "@/lib/rate-limit",
    );
  return { ...actual, enforceRateLimit: () => Promise.resolve() };
});
vi.mock("../repo/bot-repo", () => ({
  findBlockRow: (...args: unknown[]) => findBlockRowMock(...args),
  updateBlockRow: (...args: unknown[]) => updateBlockRowMock(...args),
  insertMessage: (...args: unknown[]) => insertMessageMock(...args),
}));
vi.mock("../service/journal", async () => {
  const actual =
    await vi.importActual<typeof import("../service/journal")>(
      "../service/journal",
    );
  return {
    ...actual,
    journalDirect: (...args: unknown[]) => journalMock(...args),
  };
});
vi.mock("../service/tools", async () => {
  const actual =
    await vi.importActual<typeof import("../service/tools")>(
      "../service/tools",
    );
  return {
    ...actual,
    runTool: (...args: unknown[]) => runToolMock(...args),
  };
});

const { runUiAction } = await import("../service/ui-action");

function jobsBlock(at = NOW): UiBlock {
  return {
    v: 1,
    id: BLOCK,
    component: "job_cards",
    props: {
      items: [
        {
          id: JOB,
          title: "Solidity Engineer",
          company: "Acme",
          actions: [`save:${JOB}`],
        },
      ],
    },
    source: {
      tool: "search_jobs",
      at: at.toISOString(),
      ttlSec: 3600,
      refresh: { tool: "search_jobs", args: { q: "solidity" } },
    },
    fallback: { text: "Jobs:\n• Solidity Engineer — Acme" },
    actions: [
      {
        id: `save:${JOB}`,
        type: "action",
        label: "Save",
        doneLabel: "Saved",
        tool: "save_job",
        args: { jobId: JOB },
        write: true,
      },
      // A tool that is not on the list, as if someone wrote it in.
      {
        id: "hide",
        type: "action",
        label: "Hide",
        doneLabel: "Hidden",
        tool: "hide_job",
        args: { jobId: JOB },
        write: true,
      },
      { id: "refresh", type: "refresh", label: "Refresh" },
    ],
  } as UiBlock;
}

function kept(block: UiBlock) {
  return {
    message: { id: "row-1", conversationId: "c1", toolCall: { ui: block } },
    conversation: { id: "c1", locale: "en", state: {}, userId: USER },
  };
}

const press = (actionId: string, userId: string | null = USER) =>
  runUiAction(
    { userId, token: "tok", ip: "203.0.113.5", blockId: BLOCK, actionId },
    NOW,
  );

describe("buttons on Spoki blocks (D523)", () => {
  beforeEach(() => {
    for (const mock of [
      runToolMock,
      findBlockRowMock,
      updateBlockRowMock,
      insertMessageMock,
      journalMock,
    ])
      mock.mockReset();
    findBlockRowMock.mockResolvedValue(kept(jobsBlock()));
  });

  it("finds the block only in the caller's own threads", async () => {
    findBlockRowMock.mockResolvedValue(undefined);
    await expect(press(`save:${JOB}`)).rejects.toMatchObject({ status: 404 });
    expect(findBlockRowMock).toHaveBeenCalledWith(
      expect.objectContaining({ blockId: BLOCK, userId: USER }),
    );
    expect(runToolMock).not.toHaveBeenCalled();
  });

  it("refuses a button the block does not have", async () => {
    await expect(press("delete:everything")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("saves with the stored arguments, in the journal, and remembers it", async () => {
    runToolMock.mockResolvedValue({
      llm: "Saved.",
      audit: { type: "job", id: JOB },
    });
    const result = await press(`save:${JOB}`);
    expect(result).toEqual({
      kind: "done",
      actionId: `save:${JOB}`,
      label: "Saved",
    });
    expect(runToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, conversationId: "c1" }),
      "save_job",
      { jobId: JOB },
    );
    expect(journalMock).toHaveBeenCalledWith(
      expect.objectContaining({ tool: "save_job", ok: true, channel: "web" }),
    );
    expect(updateBlockRowMock).toHaveBeenCalledWith("row-1", {
      done: `save:${JOB}`,
    });
    expect(insertMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ role: "system_event" }),
    );
  });

  it("asks a guest to sign in before a write", async () => {
    await expect(press(`save:${JOB}`, null)).rejects.toMatchObject({
      status: 401,
    });
    expect(runToolMock).not.toHaveBeenCalled();
  });

  it("does not write from stale data", async () => {
    findBlockRowMock.mockResolvedValue(
      kept(jobsBlock(new Date(NOW.getTime() - 2 * 3600 * 1000))),
    );
    await expect(press(`save:${JOB}`)).rejects.toMatchObject({
      status: 409,
      code: "BLOCK_STALE",
    });
    expect(runToolMock).not.toHaveBeenCalled();
  });

  it("runs only tools on the list", async () => {
    await expect(press("hide")).rejects.toMatchObject({ status: 400 });
    expect(runToolMock).not.toHaveBeenCalled();
  });

  it("notes a failed write in the journal", async () => {
    runToolMock.mockRejectedValue(new Error("db down"));
    await expect(press(`save:${JOB}`)).rejects.toThrow("db down");
    expect(journalMock).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false }),
    );
    expect(updateBlockRowMock).not.toHaveBeenCalled();
  });

  it("refreshes with the same read and keeps the block id", async () => {
    runToolMock.mockResolvedValue({
      llm: "one job",
      client: {
        kind: "jobs",
        data: [{ id: JOB, title: "Solidity Lead", companyName: "Acme" }],
      },
    });
    const result = await press("refresh", null);
    expect(runToolMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: null }),
      "search_jobs",
      { q: "solidity" },
    );
    expect(result.kind).toBe("refreshed");
    const block = (result as { block: UiBlock }).block;
    expect(block.id).toBe(BLOCK);
    expect(block.source.at).toBe(NOW.toISOString());
    expect(JSON.stringify(block.props)).toContain("Solidity Lead");
    expect(updateBlockRowMock).toHaveBeenCalledWith("row-1", { ui: block });
  });
});
