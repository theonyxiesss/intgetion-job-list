import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UgcNiche, UgcPlatform } from "@/config/ugc";

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: vi.fn() }));

import {
  acceptInvite,
  applyToCampaign,
  confirmReceived,
  createCampaign,
  decideCampaign,
  getUgcRoom,
  markShipped,
  offerHire,
  reportDeliveryProblem,
  saveCreatorProfile,
  useUgcStore,
} from "../service/commands";
import { checkShipment, deliveryState } from "../service/delivery";
import { MemoryUgcStore } from "../service/memory";
import type { BriefInput } from "../service/records";

const COMPANY = "00000000-0000-4000-8000-000000000010";
const MEMBER = "00000000-0000-4000-8000-000000000001";
const CREATOR = "00000000-0000-4000-8000-000000000003";
const STRANGER = "00000000-0000-4000-8000-000000000009";
const ADMIN = "00000000-0000-4000-8000-000000000004";
const niches: UgcNiche[] = ["app"];
const platforms: UgcPlatform[] = ["tiktok"];
const TODAY = "2026-10-26";

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

const input = {
  carrier: "DHL",
  tracking: "JD0146000",
  expectedDate: "2026-11-01",
};

describe("shipment rules (pure)", () => {
  it("cleans what the company typed", () => {
    expect(
      checkShipment({ carrier: " DHL ", tracking: " AB123 " }, TODAY),
    ).toEqual({
      carrier: "DHL",
      tracking: "AB123",
      expectedDate: null,
    });
    expect(checkShipment(input, TODAY).expectedDate).toBe("2026-11-01");
  });

  it("refuses empty or long text, contacts and bad dates", () => {
    expect(() =>
      checkShipment({ carrier: "", tracking: "x" }, TODAY),
    ).toThrow();
    expect(() =>
      checkShipment({ carrier: "DHL", tracking: "" }, TODAY),
    ).toThrow();
    expect(() =>
      checkShipment({ carrier: "x".repeat(61), tracking: "x" }, TODAY),
    ).toThrow();
    expect(() =>
      checkShipment({ carrier: "DHL", tracking: "me@example.com" }, TODAY),
    ).toThrow();
    for (const expectedDate of [
      "2026-10-25",
      "tomorrow",
      "2027-03-01",
      "2026-13-40",
    ]) {
      expect(() =>
        checkShipment({ carrier: "DHL", tracking: "x", expectedDate }, TODAY),
      ).toThrow();
    }
  });

  it("reads the state from the marks", () => {
    expect(deliveryState({ receivedAt: null, problem: null })).toBe("shipped");
    expect(deliveryState({ receivedAt: null, problem: "damaged" })).toBe(
      "problem",
    );
    expect(deliveryState({ receivedAt: new Date(), problem: null })).toBe(
      "received",
    );
  });
});

describe("delivery of a physical product (U6)", () => {
  let store: MemoryUgcStore;
  let campaignId: string;
  let inviteId: string;

  beforeEach(async () => {
    store = new MemoryUgcStore();
    store.now = () => new Date(`${TODAY}T10:00:00.000Z`);
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
    await saveCreatorProfile(CREATOR, {
      displayName: "Ada",
      languages: ["en"],
      platforms,
      niches,
      country: null,
      exampleUrls: [],
      inviteOptIn: true,
      status: "active",
    });
    await applyToCampaign(CREATOR, campaignId);
    inviteId = (await offerHire(MEMBER, campaignId, CREATOR)).inviteId;
  });

  it("starts only after the creator agreed", async () => {
    await expect(markShipped(MEMBER, inviteId, input)).rejects.toMatchObject({
      status: 409,
    });
    await acceptInvite(CREATOR, inviteId);
    expect(await markShipped(MEMBER, inviteId, input)).toEqual({
      state: "shipped",
    });
  });

  describe("after hire", () => {
    beforeEach(async () => {
      await acceptInvite(CREATOR, inviteId);
    });

    it("lets the company send once and shows both sides the same state", async () => {
      expect((await getUgcRoom(MEMBER, inviteId)).canShip).toBe(true);
      await markShipped(MEMBER, inviteId, input);
      await expect(markShipped(MEMBER, inviteId, input)).rejects.toMatchObject({
        status: 409,
      });
      const company = await getUgcRoom(MEMBER, inviteId);
      const creator = await getUgcRoom(CREATOR, inviteId);
      expect(company.shipment).toMatchObject({
        state: "shipped",
        carrier: "DHL",
      });
      expect(creator.shipment).toEqual(company.shipment);
      expect(company.canShip).toBe(false);
      expect(creator.canConfirmReceipt).toBe(true);
      expect(creator.canReportProblem).toBe(true);
      expect(
        creator.items.some(
          (item) => item.kind === "event" && item.event === "shipped",
        ),
      ).toBe(true);
    });

    it("lets the creator confirm receipt, once", async () => {
      await markShipped(MEMBER, inviteId, input);
      expect(await confirmReceived(CREATOR, inviteId)).toEqual({
        state: "received",
      });
      await expect(confirmReceived(CREATOR, inviteId)).rejects.toMatchObject({
        status: 409,
      });
      const room = await getUgcRoom(CREATOR, inviteId);
      expect(room.shipment?.state).toBe("received");
      expect(room.canConfirmReceipt).toBe(false);
      expect(room.canReportProblem).toBe(false);
    });

    it("lets the creator report a problem, then the company send again", async () => {
      await markShipped(MEMBER, inviteId, input);
      await reportDeliveryProblem(CREATOR, inviteId, "not_arrived");
      let company = await getUgcRoom(MEMBER, inviteId);
      expect(company.shipment).toMatchObject({
        state: "problem",
        problem: "not_arrived",
      });
      expect(company.canShip).toBe(true);
      await markShipped(MEMBER, inviteId, {
        carrier: "UPS",
        tracking: "1Z999",
      });
      company = await getUgcRoom(MEMBER, inviteId);
      expect(company.shipment).toMatchObject({
        state: "shipped",
        carrier: "UPS",
        problem: null,
      });
    });

    it("lets the creator confirm receipt after a problem (it came late)", async () => {
      await markShipped(MEMBER, inviteId, input);
      await reportDeliveryProblem(CREATOR, inviteId, "damaged");
      await confirmReceived(CREATOR, inviteId);
      expect((await getUgcRoom(CREATOR, inviteId)).shipment?.state).toBe(
        "received",
      );
    });

    it("refuses a problem before sending, after receipt, or with an unknown reason", async () => {
      await expect(
        reportDeliveryProblem(CREATOR, inviteId, "damaged"),
      ).rejects.toMatchObject({ status: 409 });
      await markShipped(MEMBER, inviteId, input);
      await expect(
        reportDeliveryProblem(CREATOR, inviteId, "because" as never),
      ).rejects.toMatchObject({ status: 400 });
      await confirmReceived(CREATOR, inviteId);
      await expect(
        reportDeliveryProblem(CREATOR, inviteId, "damaged"),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("keeps the sides apart and refuses strangers and guests", async () => {
      await expect(markShipped(CREATOR, inviteId, input)).rejects.toMatchObject(
        {
          status: 404,
        },
      );
      await markShipped(MEMBER, inviteId, input);
      await expect(confirmReceived(MEMBER, inviteId)).rejects.toMatchObject({
        status: 404,
      });
      await expect(
        reportDeliveryProblem(MEMBER, inviteId, "damaged"),
      ).rejects.toMatchObject({ status: 404 });
      for (const user of [STRANGER, null]) {
        await expect(markShipped(user, inviteId, input)).rejects.toThrow();
        await expect(confirmReceived(user, inviteId)).rejects.toThrow();
      }
    });

    it("works before migration 0082: the room opens without delivery", async () => {
      store.getShipment = async () => {
        throw Object.assign(new Error("no table"), { code: "42P01" });
      };
      const room = await getUgcRoom(CREATOR, inviteId);
      expect(room.shipment).toBeNull();
      expect(room.canConfirmReceipt).toBe(false);
    });
  });
});
