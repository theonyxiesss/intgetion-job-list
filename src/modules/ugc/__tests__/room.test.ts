import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  applyToCampaign,
  createCampaign,
  decideCampaign,
  getUgcRoom,
  markUgcRoomRead,
  readCampaign,
  updateCampaignText,
  offerHire,
  postUgcRoomMessage,
  saveCreatorProfile,
  useUgcStore,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";
import { buildRoomFeed, checkRoomMessage } from "../service/room";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const OTHER_CREATOR = "00000000-0000-4000-8000-000000000005";
const STRANGER = "00000000-0000-4000-8000-000000000009";
const ADMIN = "00000000-0000-4000-8000-000000000004";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

const brief: BriefInput = {
  companyId: COMPANY,
  productName: "North",
  productSummary: "A small app",
  goal: "awareness",
  niches,
  audience: "People who try new apps",
  country: null,
  languages: ["en"],
  mustSay: "Say the name",
  mustNot: "Do not promise income",
  platforms,
  videosWanted: 2,
  bountyMinor: BigInt(1500),
  deadline: "2099-10-20",
  rights: "ads",
  pitch: "We would like a short video",
  exampleUrls: [],
};

describe("room message rules (pure)", () => {
  it("takes text while the offer or the work is open", () => {
    expect(checkRoomMessage({ status: "offered", body: " Hi " })).toBe("Hi");
    expect(checkRoomMessage({ status: "hired", body: "Hello" })).toBe("Hello");
  });

  it("refuses after the order ended", () => {
    for (const status of [
      "applied",
      "declined",
      "expired",
      "withdrawn",
    ] as const) {
      expect(() => checkRoomMessage({ status, body: "Hi" })).toThrowError(
        expect.objectContaining({ status: 409, code: "UGC_ROOM_CLOSED" }),
      );
    }
  });

  it("refuses empty, too long and contact text", () => {
    expect(() => checkRoomMessage({ status: "hired", body: "  " })).toThrow();
    expect(() =>
      checkRoomMessage({ status: "hired", body: "x".repeat(2001) }),
    ).toThrow();
    expect(() =>
      checkRoomMessage({ status: "hired", body: "mail me@example.com" }),
    ).toThrowError(expect.objectContaining({ code: "CONTACTS_IN_TEXT" }));
    expect(() =>
      checkRoomMessage({ status: "hired", body: "see https://example.com" }),
    ).toThrow();
  });
});

describe("room feed (pure)", () => {
  const base = {
    viewerId: "creator",
    creatorId: "creator",
    offeredAt: "2026-10-01T10:00:00.000Z",
    agreedAt: "2026-10-01T11:00:00.000Z",
  };

  it("orders events and messages by time and marks the viewer's own", () => {
    const feed = buildRoomFeed({
      ...base,
      messages: [
        {
          id: "m2",
          authorId: "company-member",
          body: "Welcome",
          createdAt: "2026-10-01T12:00:00.000Z",
          hiddenAt: null,
        },
        {
          id: "m1",
          authorId: "creator",
          body: "Question",
          createdAt: "2026-10-01T10:30:00.000Z",
          hiddenAt: null,
        },
      ],
    });
    expect(feed.map((item) => item.id)).toEqual([
      "offered",
      "m1",
      "agreed",
      "m2",
    ]);
    expect(feed[1]).toMatchObject({ side: "creator", mine: true });
    expect(feed[3]).toMatchObject({ side: "company", mine: false });
  });

  it("shows the company's answer to the video after it was sent", () => {
    const feed = buildRoomFeed({
      ...base,
      messages: [],
      videoSentAt: "2026-10-02T09:00:00.000Z",
      decidedAt: "2026-10-03T09:00:00.000Z",
    });
    expect(feed.at(-1)).toMatchObject({ kind: "event", event: "decided" });
  });

  it("shows the latest video as an event between the agreement and the talk", () => {
    const feed = buildRoomFeed({
      ...base,
      messages: [],
      videoSentAt: "2026-10-02T09:00:00.000Z",
    });
    expect(feed.map((item) => item.kind === "event" && item.event)).toEqual([
      "offered",
      "agreed",
      "video_sent",
    ]);
  });

  it("keeps a hidden line without its text and a deleted author's side", () => {
    const feed = buildRoomFeed({
      ...base,
      offeredAt: null,
      agreedAt: null,
      messages: [
        {
          id: "a",
          authorId: "company-member",
          body: "secret",
          createdAt: "2026-10-01T10:00:00.000Z",
          hiddenAt: "2026-10-02T10:00:00.000Z",
        },
        {
          id: "b",
          authorId: null,
          body: "gone",
          createdAt: "2026-10-01T10:01:00.000Z",
          hiddenAt: null,
        },
      ],
    });
    expect(feed[0]).toMatchObject({ body: null, hidden: true });
    expect(feed[1]).toMatchObject({ side: "deleted", mine: false });
  });
});

describe("room through the service (U4, D574)", () => {
  let store: MemoryUgcStore;
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
    const created = await createCampaign(MEMBER, brief);
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    campaignId = created.id;
    for (const id of [CREATOR, OTHER_CREATOR]) {
      await saveCreatorProfile(id, {
        displayName: "Ada",
        languages: ["en"],
        platforms,
        niches,
        country: null,
        exampleUrls: [],
        inviteOptIn: true,
        status: "active",
      });
    }
    await applyToCampaign(CREATOR, campaignId);
    inviteId = (await offerHire(MEMBER, campaignId, CREATOR)).inviteId;
  });

  it("shows the agreed terms on the card and flags a later brief edit", async () => {
    const companyView = async () =>
      (await readCampaign(MEMBER, campaignId)) as Extract<
        Awaited<ReturnType<typeof readCampaign>>,
        { role: "company" }
      >;
    const offered = (await companyView()).participants.find(
      (row) => row.inviteId === inviteId,
    );
    expect(offered?.terms?.pitch).toBe(brief.pitch);
    expect(offered?.termsChanged).toBe(false);
    await updateCampaignText(MEMBER, campaignId, { pitch: "Changed pitch" });
    const edited = await companyView();
    expect(
      edited.participants.find((row) => row.inviteId === inviteId)
        ?.termsChanged,
    ).toBe(true);
    expect(edited.versions.at(-1)?.snapshot.pitch).toBe("Changed pitch");
  });

  it("counts the other party's new messages until this party opens the room", async () => {
    let clock = Date.parse("2026-10-27T10:00:00.000Z");
    store.now = () => new Date((clock += 1000));
    await postUgcRoomMessage(MEMBER, inviteId, "Hello");
    await postUgcRoomMessage(MEMBER, inviteId, "Second");
    expect((await getUgcRoom(CREATOR, inviteId)).unread).toBe(2);
    expect((await getUgcRoom(MEMBER, inviteId)).unread).toBe(0);
    await markUgcRoomRead(CREATOR, inviteId);
    expect((await getUgcRoom(CREATOR, inviteId)).unread).toBe(0);
    await postUgcRoomMessage(MEMBER, inviteId, "Third");
    expect((await getUgcRoom(CREATOR, inviteId)).unread).toBe(1);
  });

  it("lets both parties talk in the same room", async () => {
    await postUgcRoomMessage(CREATOR, inviteId, "Can I film outdoors?");
    const room = await postUgcRoomMessage(MEMBER, inviteId, "Yes, please.");
    expect(room.side).toBe("company");
    expect(room.writable).toBe(true);
    const bodies = room.items.flatMap((item) =>
      item.kind === "message" ? [item.body] : [],
    );
    expect(bodies).toEqual(["Can I film outdoors?", "Yes, please."]);
    const creatorView = await getUgcRoom(CREATOR, inviteId);
    expect(creatorView.side).toBe("creator");
    expect(
      creatorView.items.filter((item) => item.kind === "message" && item.mine),
    ).toHaveLength(1);
  });

  it("shows the offer as an event", async () => {
    const room = await getUgcRoom(CREATOR, inviteId);
    expect(room.items[0]).toMatchObject({ kind: "event", event: "offered" });
  });

  it("gives a stranger, another creator and a guest nothing", async () => {
    for (const user of [STRANGER, OTHER_CREATOR]) {
      await expect(getUgcRoom(user, inviteId)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        postUgcRoomMessage(user, inviteId, "Hi"),
      ).rejects.toMatchObject({ status: 404 });
    }
    await expect(getUgcRoom(null, inviteId)).rejects.toMatchObject({
      status: 401,
    });
    expect(store.roomMessages).toHaveLength(0);
  });

  it("closes the room when the offer is gone", async () => {
    const invite = (await store.getInvite(inviteId))!;
    invite.status = "declined";
    await store.saveInvite(invite);
    const room = await getUgcRoom(CREATOR, inviteId);
    expect(room.writable).toBe(false);
    await expect(
      postUgcRoomMessage(CREATOR, inviteId, "Hi"),
    ).rejects.toMatchObject({ status: 409, code: "UGC_ROOM_CLOSED" });
  });

  it("answers 503 and an empty feed before migration 0078", async () => {
    const missing = Object.assign(new Error("no table"), { code: "42P01" });
    store.listRoomMessages = async () => {
      throw missing;
    };
    store.insertRoomMessage = async () => {
      throw missing;
    };
    const room = await getUgcRoom(CREATOR, inviteId);
    expect(room).toMatchObject({ ready: false, writable: false });
    await expect(
      postUgcRoomMessage(CREATOR, inviteId, "Hi"),
    ).rejects.toMatchObject({ status: 503, code: "UGC_ROOM_NOT_READY" });
  });
});
