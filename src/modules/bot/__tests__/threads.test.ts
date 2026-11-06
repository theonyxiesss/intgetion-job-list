import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSessionToken } from "../service/conversation";

const OWNER = "00000000-0000-4000-8000-000000000001";
const OTHER = "00000000-0000-4000-8000-000000000002";
const THREAD = "00000000-0000-4000-8000-0000000000a1";

const db = vi.hoisted(() => ({
  byToken: new Map<string, unknown>(),
  byId: new Map<string, unknown>(),
  list: [] as { id: string; lastMessageAt: Date; firstLine: string | null }[],
  replaced: [] as [string, string][],
  deleted: [] as string[],
}));

vi.mock("../repo/bot-repo", async () => {
  const actual =
    await vi.importActual<typeof import("../repo/bot-repo")>(
      "../repo/bot-repo",
    );
  return {
    ...actual,
    findConversationByToken: async (hash: string) => db.byToken.get(hash),
    findConversationById: async (id: string) => db.byId.get(id),
    listGeneralConversationsForUser: async () => db.list,
    replaceSessionToken: async (id: string, hash: string) => {
      db.replaced.push([id, hash]);
    },
    deleteConversation: async (id: string) => {
      db.deleted.push(id);
    },
  };
});

const { deleteMyConversation, listMyConversations, openMyConversation } =
  await import("../service/threads");

function thread(over: Record<string, unknown> = {}) {
  return {
    id: THREAD,
    userId: OWNER,
    channel: "web",
    jobId: null,
    campaignId: null,
    inviteId: null,
    lastMessageAt: new Date("2026-11-07T10:00:00Z"),
    ...over,
  };
}

beforeEach(() => {
  db.byToken.clear();
  db.byId.clear();
  db.list = [];
  db.replaced = [];
  db.deleted = [];
});

describe("chat home dialogues (TZ 53)", () => {
  it("titles each thread by its first line and marks the open one", async () => {
    db.byToken.set(hashSessionToken("cookie"), thread());
    db.list = [
      {
        id: THREAD,
        lastMessageAt: new Date("2026-11-07T10:00:00Z"),
        firstLine: "  Find   me remote React jobs ".repeat(4),
      },
      {
        id: "00000000-0000-4000-8000-0000000000a2",
        lastMessageAt: new Date("2026-11-06T10:00:00Z"),
        firstLine: null,
      },
    ];
    const list = await listMyConversations({ userId: OWNER, token: "cookie" });
    expect(list[0].current).toBe(true);
    expect(list[0].title?.startsWith("Find me remote React jobs")).toBe(true);
    expect(Array.from(list[0].title ?? "")).toHaveLength(60);
    expect(list[1]).toMatchObject({ title: null, current: false });
  });

  it("gives a guest only the thread on its cookie", async () => {
    db.byToken.set(hashSessionToken("guest"), thread({ userId: null }));
    expect(await listMyConversations({ userId: null, token: "guest" })).toEqual(
      [expect.objectContaining({ id: THREAD, current: true, title: null })],
    );
    expect(
      await listMyConversations({ userId: null, token: undefined }),
    ).toEqual([]);
  });

  it("moves the cookie only to the owner's general thread", async () => {
    db.byId.set(THREAD, thread());
    const { token } = await openMyConversation(OWNER, THREAD);
    expect(db.replaced).toEqual([[THREAD, hashSessionToken(token)]]);
  });

  it.each([
    ["someone else's", thread({ userId: OTHER })],
    ["a vacancy", thread({ jobId: "00000000-0000-4000-8000-0000000000b1" })],
    ["a Telegram", thread({ channel: "telegram" })],
  ])("refuses %s thread", async (_name, row) => {
    db.byId.set(THREAD, row);
    await expect(openMyConversation(OWNER, THREAD)).rejects.toMatchObject({
      status: 404,
    });
    await expect(deleteMyConversation(OWNER, THREAD)).rejects.toMatchObject({
      status: 404,
    });
    expect(db.replaced).toEqual([]);
    expect(db.deleted).toEqual([]);
  });

  it("deletes the owner's thread", async () => {
    db.byId.set(THREAD, thread());
    await deleteMyConversation(OWNER, THREAD);
    expect(db.deleted).toEqual([THREAD]);
  });
});
