import { describe, expect, it, beforeEach } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";
import { ugcTools } from "../service/bot-tools";
import {
  acceptInvite,
  createCampaign,
  decideCampaign,
  decideSubmission,
  listWinners,
  offerHire,
  readCampaign,
  reportLivePost,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
  closeCampaign,
} from "../service/commands";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput, ProfileInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const OUTSIDER = "00000000-0000-4000-8000-000000000002";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const ADMIN = "00000000-0000-4000-8000-000000000004";

const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];

function brief(over: Partial<BriefInput> = {}): BriefInput {
  return {
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
    deadline: "2026-10-20",
    rights: "ads",
    pitch: "We would like a short video",
    exampleUrls: [],
    ...over,
  };
}

function profile(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    displayName: "Ada",
    languages: ["en"],
    platforms,
    niches,
    country: null,
    exampleUrls: [],
    inviteOptIn: true,
    status: "active",
    ...over,
  };
}

describe("creative tests phase B", () => {
  let store: MemoryUgcStore;

  beforeEach(() => {
    store = new MemoryUgcStore();
    store.members.push({ companyId: COMPANY, userId: MEMBER });
    store.companies.push({ id: COMPANY, name: "North", userId: MEMBER });
    useUgcStore(store);
  });

  async function decided(to: "accepted" | "winner" | "rejected") {
    const created = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: created.id,
      to: "open",
    });
    await saveCreatorProfile(CREATOR, profile());
    const offer = await offerHire(MEMBER, created.id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/1",
      "",
    );
    await decideSubmission(MEMBER, offer.inviteId, to);
    return { campaignId: created.id, inviteId: offer.inviteId };
  }

  it("stores a reported count only after accept or winner, and does not fetch", async () => {
    const row = await decided("accepted");
    let fetched = 0;
    const original = globalThis.fetch;
    globalThis.fetch = (() => {
      fetched += 1;
      throw new Error("fetch");
    }) as typeof fetch;
    try {
      await expect(
        reportLivePost(CREATOR, row.inviteId, "https://example.com/v", 10),
      ).rejects.toMatchObject({ status: 422 });
      const saved = await reportLivePost(
        CREATOR,
        row.inviteId,
        "https://www.tiktok.com/@ada/video/1",
        1200,
      );
      expect(saved).toEqual({
        reportedViews: 1200,
        viewsSource: "reported",
        charged: false,
      });
      expect(fetched).toBe(0);
    } finally {
      globalThis.fetch = original;
    }
    const again = await reportLivePost(
      CREATOR,
      row.inviteId,
      "https://youtu.be/abcdefghijk",
      0,
    );
    expect(again.reportedViews).toBe(0);
    const view = await readCampaign(MEMBER, row.campaignId);
    if (view.role !== "company") throw new Error("role");
    expect(view.participants[0]?.submission?.viewsSource).toBe("reported");
    expect(view.participants[0]?.submission?.reportedViews).toBe(0);
    expect(JSON.stringify(view)).not.toContain("verified");
  });

  it("refuses a guest, the company, a pending video and a rejected video", async () => {
    const row = await decided("winner");
    await expect(
      reportLivePost(null, row.inviteId, "https://www.tiktok.com/v/1", 1),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      reportLivePost(MEMBER, row.inviteId, "https://www.tiktok.com/v/1", 1),
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      reportLivePost(CREATOR, row.inviteId, "https://www.tiktok.com/v/1", -1),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      reportLivePost(
        CREATOR,
        row.inviteId,
        "https://www.tiktok.com/v/1",
        2_000_000_001,
      ),
    ).rejects.toMatchObject({ status: 400 });

    const pending = await createCampaign(MEMBER, brief());
    await decideCampaign({
      adminId: ADMIN,
      isAdmin: true,
      campaignId: pending.id,
      to: "open",
    });
    const offer = await offerHire(MEMBER, pending.id, CREATOR);
    await acceptInvite(CREATOR, offer.inviteId);
    await submitVideo(
      CREATOR,
      offer.inviteId,
      "https://www.tiktok.com/v/2",
      "",
    );
    await expect(
      reportLivePost(CREATOR, offer.inviteId, "https://www.tiktok.com/v/2", 3),
    ).rejects.toMatchObject({ status: 409 });

    const rejected = await decided("rejected");
    await expect(
      reportLivePost(
        CREATOR,
        rejected.inviteId,
        "https://www.tiktok.com/v/3",
        3,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("lists only winners for a member, and still accepts a report after close", async () => {
    const row = await decided("winner");
    await reportLivePost(
      CREATOR,
      row.inviteId,
      "https://www.instagram.com/reel/abc",
      40,
    );
    await closeCampaign(MEMBER, row.campaignId);
    const after = await reportLivePost(
      CREATOR,
      row.inviteId,
      "https://www.instagram.com/reel/abc",
      41,
    );
    expect(after.charged).toBe(false);
    await expect(listWinners(null, row.campaignId)).rejects.toMatchObject({
      status: 401,
    });
    await expect(listWinners(OUTSIDER, row.campaignId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(listWinners(CREATOR, row.campaignId)).rejects.toMatchObject({
      status: 404,
    });
    const page = await listWinners(MEMBER, row.campaignId);
    expect(page.winners).toEqual([
      {
        inviteId: row.inviteId,
        displayName: "Ada",
        rights: "ads",
        liveUrl: "https://www.instagram.com/reel/abc",
        reportedViews: 41,
        viewsSource: "reported",
        payout: {
          amountMinor: "1500",
          status: "owed",
          charged: false,
          sent: false,
        },
      },
    ]);
    expect(JSON.stringify(page)).not.toMatch(/@|verified/);
  });

  it("lets the bot read the count as reported and does not give it a write tool", async () => {
    const row = await decided("winner");
    await reportLivePost(
      CREATOR,
      row.inviteId,
      "https://www.tiktok.com/v/9",
      9,
    );
    expect(ugcTools.some((tool) => tool.name === "report_ugc_views")).toBe(
      false,
    );
    const read = ugcTools.find((tool) => tool.name === "get_ugc_winners");
    if (!read) throw new Error("tool");
    expect(read.confirm()).toBe(false);
    expect(read.description).toContain("reported");
    expect(read.description).toContain("Do not fetch");
    const listed = read.run as (
      ctx: { userId: string | null; state: { topic?: string } },
      input: { campaignId: string },
    ) => Promise<{ llm: string }>;
    const winners = await listed(
      { userId: MEMBER, state: {} },
      { campaignId: row.campaignId },
    );
    expect(winners.llm).toContain("reported");
    expect(winners.llm).not.toContain("verified");
  });
});
