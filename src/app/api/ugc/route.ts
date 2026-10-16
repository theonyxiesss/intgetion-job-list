import { z } from "zod";
import { UGC_GOALS, UGC_NICHES, UGC_PLATFORMS, UGC_RIGHTS } from "@/config/ugc";
import { readJson, toErrorResponse } from "@/lib/http";
import { requireUser } from "@/lib/auth-guards";
import {
  acceptInvite,
  applyToCampaign,
  closeCampaign,
  createCampaign,
  decideCampaign,
  decideSubmission,
  declineInvite,
  issueJoinLink,
  offerHire,
  redeemJoinToken,
  remindInvite,
  requestChanges,
  saveCreatorProfile,
  submitVideo,
} from "@/modules/ugc/service";

const brief = {
  companyId: z.uuid(),
  productName: z.string().trim().min(1).max(120),
  productSummary: z.string().trim().min(1).max(400),
  goal: z.enum(UGC_GOALS),
  niches: z.array(z.enum(UGC_NICHES)).min(1),
  audience: z.string().trim().min(1).max(300),
  country: z.string().length(2).nullable(),
  languages: z.array(z.string()).min(1),
  mustSay: z.string().trim().min(1).max(1000),
  mustNot: z.string().trim().min(1).max(1000),
  platforms: z.array(z.enum(UGC_PLATFORMS)).min(1),
  videosWanted: z.number().int().min(1).max(30),
  bountyMinor: z.string().regex(/^\d+$/),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rights: z.enum(UGC_RIGHTS),
  pitch: z.string().max(300),
  exampleUrls: z.array(z.string()).max(5),
};

const body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("profile"),
    displayName: z.string().trim().min(1).max(80),
    languages: z.array(z.string()).min(1),
    platforms: z.array(z.enum(UGC_PLATFORMS)).min(1),
    niches: z.array(z.enum(UGC_NICHES)).min(1),
    country: z.string().length(2).nullable(),
    exampleUrls: z.array(z.string()).max(5),
    inviteOptIn: z.boolean(),
    status: z.enum(["active", "paused"]),
  }),
  z.object({ action: z.literal("create"), ...brief }),
  z.object({ action: z.literal("apply"), campaignId: z.uuid() }),
  z.object({
    action: z.literal("offer"),
    campaignId: z.uuid(),
    creatorId: z.uuid(),
  }),
  z.object({ action: z.literal("accept"), inviteId: z.uuid() }),
  z.object({ action: z.literal("decline"), inviteId: z.uuid() }),
  z.object({
    action: z.literal("submit"),
    inviteId: z.uuid(),
    url: z.string().max(500),
    hook: z.string().max(300),
  }),
  z.object({
    action: z.literal("changes"),
    inviteId: z.uuid(),
    note: z.string().max(500),
  }),
  z.object({
    action: z.literal("decide"),
    inviteId: z.uuid(),
    to: z.enum(["accepted", "rejected", "winner"]),
  }),
  z.object({ action: z.literal("remind"), inviteId: z.uuid() }),
  z.object({ action: z.literal("close"), campaignId: z.uuid() }),
  z.object({ action: z.literal("join"), campaignId: z.uuid() }),
  z.object({ action: z.literal("redeem"), payload: z.string().max(64) }),
  z.object({
    action: z.literal("moderate"),
    campaignId: z.uuid(),
    to: z.enum(["open", "rejected"]),
  }),
]);

/** Writes for creative tests. The same functions serve the bot (D457). */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = await readJson(request, body);
    const id = user.id;
    if (input.action === "profile") {
      const { action, ...profile } = input;
      void action;
      return Response.json(await saveCreatorProfile(id, profile));
    }
    if (input.action === "create") {
      const { action, bountyMinor, ...rest } = input;
      void action;
      return Response.json(
        await createCampaign(id, { ...rest, bountyMinor: BigInt(bountyMinor) }),
      );
    }
    if (input.action === "apply") {
      return Response.json(await applyToCampaign(id, input.campaignId));
    }
    if (input.action === "offer") {
      return Response.json(
        await offerHire(id, input.campaignId, input.creatorId),
      );
    }
    if (input.action === "accept") {
      return Response.json(await acceptInvite(id, input.inviteId));
    }
    if (input.action === "decline") {
      return Response.json(await declineInvite(id, input.inviteId));
    }
    if (input.action === "submit") {
      return Response.json(
        await submitVideo(id, input.inviteId, input.url, input.hook),
      );
    }
    if (input.action === "changes") {
      return Response.json(
        await requestChanges(id, input.inviteId, input.note),
      );
    }
    if (input.action === "decide") {
      return Response.json(
        await decideSubmission(id, input.inviteId, input.to),
      );
    }
    if (input.action === "remind") {
      return Response.json(await remindInvite(id, input.inviteId));
    }
    if (input.action === "close") {
      return Response.json(await closeCampaign(id, input.campaignId));
    }
    if (input.action === "join") {
      return Response.json(await issueJoinLink(id, input.campaignId));
    }
    if (input.action === "redeem") {
      return Response.json(await redeemJoinToken(id, input.payload));
    }
    return Response.json(
      await decideCampaign({
        adminId: id,
        isAdmin: user.platformRole === "admin",
        campaignId: input.campaignId,
        to: input.to,
      }),
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
