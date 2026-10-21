import { z } from "zod";
import { UGC_GOALS, UGC_NICHES, UGC_PLATFORMS, UGC_RIGHTS } from "@/config/ugc";
import { HttpError } from "@/lib/http";
import { wrapUntrusted } from "@/lib/llm";
import {
  acceptInvite,
  applyToCampaign,
  campaignBudget,
  campaignWriteAllowed,
  closeCampaign,
  createCampaign,
  declineInvite,
  decideSubmission,
  getMyCreatorProfile,
  issueJoinLink,
  listMyCampaigns,
  listMyCampaignSummaries,
  ugcPriceGuide,
  listMyInvites,
  matchOpenCampaigns,
  offerHire,
  listWinners,
  previewMatches,
  readCampaign,
  remindInvite,
  requestChanges,
  saveCreatorProfile,
  setCampaignPaused,
  submitVideo,
  updateCampaignText,
} from "./commands";
import {
  confirmBriefDraft,
  isExplicitBriefConfirmation,
  isExplicitDraftReset,
  patchBriefDraft,
  resetBriefDraft,
  unconfirmedBriefRanges,
  withdrawToDraft,
} from "./drafts";
import { usdLabel, type UgcPriceGuide } from "./pricing";

type Ctx = {
  userId: string | null;
  state: {
    topic?: string;
    ugcCampaignId?: string;
    ugcDraftMode?: boolean;
    ugcDraftId?: string;
    lastUserText?: string;
  };
  locale: string;
};

const id = z.uuid();
const write = () => true;
const read = () => false;

function assertUgcTopic(ctx: Ctx) {
  if (!campaignWriteAllowed(ctx.state.topic)) {
    throw new HttpError(
      409,
      "UGC_TOPIC_REQUIRED",
      "Open the UGC videos card before writing a brief",
    );
  }
}

/** The product name of a brief the caller's company owns; else 404. */
async function ownBriefName(ctx: Ctx, campaignId: string) {
  const view = await readCampaign(ctx.userId, campaignId);
  if (view.role !== "company")
    throw new HttpError(404, "NOT_FOUND", "Not found");
  return view.brief.productName;
}

function model(value: unknown) {
  return wrapUntrusted("ugc:brief", JSON.stringify(value));
}

/**
 * Spoki tools for creative tests (27.8). Writes need the existing
 * confirmation card. The services topic cannot call the create tool.
 */
/** What Spoki may say about a reward: only these numbers (D464). */
export function priceGuideForModel(guide: UgcPriceGuide): string {
  const hint =
    "Rights for paid ads or the brand's own account usually cost more than an organic post; that is a hint, the company decides. The reward is per accepted video.";
  if (guide.source === "presets") {
    return `Too few reviewed UGC briefs to show a range. Ready amounts per video: ${guide.presets.map(usdLabel).join(", ")}; ${usdLabel(guide.medianMinor)} is the usual pick. ${hint} Name only these amounts.`;
  }
  return `Reward per accepted video in ${guide.count} reviewed UGC briefs: minimum ${usdLabel(guide.minMinor)}, median ${usdLabel(guide.medianMinor)}, maximum ${usdLabel(guide.maxMinor)}. ${hint} Name only these amounts.`;
}

export const ugcTools = [
  {
    name: "patch_brief",
    description:
      "In the new UGC brief thread, save only fields clearly stated or corrected in the latest user message. Omit unknown fields. Never guess numeric ranges. If the user explicitly says to choose defaults, set useDefaults=true. This updates the shared draft immediately. The card with the link to the brief form shows by itself once the brief is complete; set showCard=true (an empty patch is fine) only when the person asks for the link or the card.",
    input: z
      .object({
        companyId: z.uuid().optional(),
        patch: z
          .object({
            productName: z.string().optional(),
            description: z.string().optional(),
            goal: z.enum(UGC_GOALS).optional(),
            audience: z.string().optional(),
            countries: z.array(z.string()).optional(),
            languages: z.array(z.string()).optional(),
            platform: z.enum(UGC_PLATFORMS).optional(),
            niche: z.enum(UGC_NICHES).optional(),
            mustSay: z.array(z.string()).optional(),
            mustNot: z.array(z.string()).optional(),
            videoCount: z.number().int().optional(),
            rewardCents: z.number().int().optional(),
            deadline: z.string().optional(),
            rights: z.enum(UGC_RIGHTS).optional(),
            pitch: z.string().optional(),
            links: z.array(z.string()).optional(),
          })
          .strict(),
        useDefaults: z.boolean().optional(),
        showCard: z.boolean().optional(),
      })
      .strict(),
    access: "user" as const,
    confirm: read,
    async run(
      ctx: Ctx,
      input: {
        companyId?: string;
        patch: Record<string, unknown>;
        useDefaults?: boolean;
        showCard?: boolean;
      },
    ) {
      if (!ctx.state.ugcDraftMode)
        throw new HttpError(
          409,
          "UGC_DRAFT_THREAD_REQUIRED",
          "Open a new UGC brief thread first",
        );
      const requestedDefaults =
        /(?:заполни сам|на твое усмотрение|на твоё усмотрение|выбери сам|реши сам|decide for me|use your judgment|fill it in for me)/i.test(
          ctx.state.lastUserText ?? "",
        );
      if (input.useDefaults && !requestedDefaults)
        throw new HttpError(
          409,
          "UGC_DEFAULTS_NOT_REQUESTED",
          "Only apply defaults when the user explicitly asks",
        );
      const pendingRanges = unconfirmedBriefRanges(
        ctx.state.lastUserText ?? "",
        input.patch,
      );
      const safePatch = { ...input.patch };
      for (const range of pendingRanges) delete safePatch[range.field];
      const result = await patchBriefDraft(ctx.userId, {
        draftId: ctx.state.ugcDraftId,
        companyId: input.companyId,
        patch: safePatch,
        requestedDefaults: input.useDefaults && requestedDefaults,
        locale: ctx.locale,
      });
      return {
        llm: model({
          draft: result.draft,
          missingRequired: result.missingRequired,
          assumptions: result.assumptions,
          suggestedRanges: pendingRanges,
        }),
        state: { ...ctx.state, ugcDraftId: result.id },
        client: {
          kind: "ugc_brief_draft",
          data: { ...result, showCard: input.showCard === true },
        },
      };
    },
  },
  {
    name: "confirm_brief",
    description:
      "Create the UGC campaign only after the user explicitly says yes, launch it, or confirms the displayed complete brief.",
    input: z.object({}).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx) {
      if (
        !ctx.state.ugcDraftMode ||
        !isExplicitBriefConfirmation(ctx.state.lastUserText ?? "")
      )
        throw new HttpError(
          409,
          "UGC_EXPLICIT_CONFIRMATION_REQUIRED",
          "Wait for explicit confirmation of the brief",
        );
      const result = await confirmBriefDraft(ctx.userId, ctx.state.ugcDraftId);
      return {
        llm: model({ status: result.status, productName: result.productName }),
        state: {
          ...ctx.state,
          ugcDraftMode: false,
          ugcDraftId: undefined,
          ugcCampaignId: result.id,
        },
        client: { kind: "ugc_campaign", data: result },
      };
    },
  },
  {
    name: "reset_draft",
    description:
      "Start a clean UGC brief when the user explicitly replaces the product or asks to reset.",
    input: z
      .object({
        patch: z
          .object({
            productName: z.string().optional(),
            description: z.string().optional(),
          })
          .strict()
          .optional(),
      })
      .strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { patch?: Record<string, unknown> }) {
      if (!ctx.state.ugcDraftMode)
        throw new HttpError(
          409,
          "UGC_DRAFT_THREAD_REQUIRED",
          "Open a new UGC brief thread first",
        );
      if (!isExplicitDraftReset(ctx.state.lastUserText ?? ""))
        throw new HttpError(
          409,
          "UGC_EXPLICIT_RESET_REQUIRED",
          "Wait for an explicit request to reset or replace the product",
        );
      const result = await resetBriefDraft(
        ctx.userId,
        ctx.state.ugcDraftId,
        input.patch,
      );
      return {
        llm: model(result),
        state: { ...ctx.state, ugcDraftId: result.id },
        client: { kind: "ugc_brief_draft", data: result },
      };
    },
  },
  {
    name: "get_my_ugc_campaigns",
    description: "List this member's UGC briefs: id, product, status.",
    input: z.object({}).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx) {
      return { llm: model(await listMyCampaigns(ctx.userId)) };
    },
  },
  {
    name: "ugc_price_range",
    description:
      "What companies set as the reward per accepted UGC video: min, median and max of reviewed briefs for a niche and platform, or the ready amounts when there are too few. Read-only. Use before naming any reward.",
    input: z
      .object({
        niche: z.enum(UGC_NICHES).optional(),
        platform: z.enum(UGC_PLATFORMS).optional(),
      })
      .strict(),
    access: "guest" as const,
    confirm: read,
    async run(
      _ctx: Ctx,
      input: {
        niche?: (typeof UGC_NICHES)[number];
        platform?: (typeof UGC_PLATFORMS)[number];
      },
    ) {
      return { llm: priceGuideForModel(await ugcPriceGuide(input)) };
    },
  },
  {
    name: "get_ugc_summary",
    description:
      "How this member's UGC briefs are going: per brief the step, counts of applications, offers, hires, videos waiting for a decision, accepted and winners, the budget, and what to do next (deposit: pay in the budget on the brief page before any offer). No contacts.",
    input: z.object({}).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx) {
      const rows = await listMyCampaignSummaries(ctx.userId);
      if (rows.length === 0) {
        return { llm: "No UGC briefs yet. Offer to collect one on a card." };
      }
      const focus =
        rows.find((row) => row.progress.next === "decide") ??
        rows.find((row) => row.progress.next === "deposit") ??
        rows.find((row) => row.progress.next === "hire") ??
        rows[0]!;
      return {
        llm: model(
          rows.map((row) => ({
            campaignId: row.id,
            product: row.productName,
            status: row.status,
            step: row.progress.step,
            next: row.progress.next,
            counts: row.progress.counts,
            videosWanted: row.videosWanted,
            rewardPerVideo: usdLabel(Number(row.bountyMinor)),
            budget: usdLabel(row.budgetMinor),
            budgetRequired: row.progress.next === "deposit",
            deadline: row.deadline,
          })),
        ),
        client: { kind: "ugc_campaign", data: { id: focus.id } },
      };
    },
  },
  {
    name: "get_ugc_campaign",
    description:
      "Read one UGC brief the caller can already see: product, task, platforms, videos wanted, reward, rights, deadline and, for the company, the counts. Use when they ask about one brief. For the company also budgetRequired and budgetPaidIn. No contacts.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { campaignId: string }) {
      const view = await readCampaign(ctx.userId, input.campaignId);
      if (view.role !== "company") return { llm: model(view) };
      const budget = await campaignBudget(ctx.userId, input.campaignId);
      return {
        llm: model({
          ...view,
          budget: usdLabel(budget.budgetMinor),
          budgetRequired: budget.required,
          budgetPaidIn: budget.paid,
        }),
      };
    },
  },
  {
    name: "list_open_ugc_campaigns",
    description:
      "Open briefs that fit this creator's profile (platform, language, niche, country), best first, up to 10, each with why it fits. Use when a creator asks for paid video work or tasks. Set all only when they ask to see every open brief.",
    input: z.object({ all: z.boolean().optional() }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { all?: boolean }) {
      const result = await matchOpenCampaigns(ctx.userId, input);
      if (!result.profileReady)
        return {
          llm: "No complete creator profile yet: name, a language, a platform and a niche are needed. Offer propose_creator_profile.",
        };
      if (!result.briefs.length)
        return {
          llm: `No open brief fits the profile now (${result.openTotal} open in total). Say so, and name what they could widen: platforms, niches, languages or country. Do not invent briefs.`,
        };
      return { llm: model(result) };
    },
  },
  {
    name: "get_ugc_applicants",
    description:
      "Applications and offers on an open brief: creator id and public card. No contacts.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { campaignId: string }) {
      const view = await readCampaign(ctx.userId, input.campaignId);
      if (view.role !== "company") {
        throw new HttpError(404, "NOT_FOUND", "Not found");
      }
      return { llm: model(view.participants) };
    },
  },
  {
    name: "get_my_ugc_invites",
    description: "This creator's applications, offers and statuses.",
    input: z.object({}).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx) {
      return { llm: model(await listMyInvites(ctx.userId)) };
    },
  },
  {
    name: "get_my_creator_profile",
    description:
      "This creator's public profile and missing fields. No contacts.",
    input: z.object({}).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx) {
      return { llm: model(await getMyCreatorProfile(ctx.userId)) };
    },
  },
  {
    name: "preview_ugc_matches",
    description: "Public cards of creators who fit an open brief. No contacts.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { campaignId: string }) {
      return { llm: model(await previewMatches(ctx.userId, input.campaignId)) };
    },
  },
  {
    name: "focus_ugc",
    description: "Focus this chat on one UGC brief. Does not write anything.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { campaignId: string }) {
      const view = await readCampaign(ctx.userId, input.campaignId);
      return {
        llm: `Focused on ${view.brief.productName}.`,
        state: {
          ...ctx.state,
          topic: "ugc" as const,
          ugcCampaignId: input.campaignId,
        },
      };
    },
  },
  {
    name: "propose_creator_profile",
    description:
      "Save the creator profile from the confirmation card. No email or phone.",
    input: z
      .object({
        displayName: z.string().trim().min(1).max(80),
        languages: z.array(z.string()).min(1).max(8),
        platforms: z.array(z.enum(UGC_PLATFORMS)).min(1),
        niches: z.array(z.enum(UGC_NICHES)).min(1),
        country: z.string().length(2).nullable(),
        exampleUrls: z.array(z.string()).max(5),
        inviteOptIn: z.boolean(),
        status: z.enum(["active", "paused"]),
      })
      .strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: Parameters<typeof saveCreatorProfile>[1]) {
      assertUgcTopic(ctx);
      return { llm: model(await saveCreatorProfile(ctx.userId, input)) };
    },
  },
  {
    name: "propose_ugc_campaign",
    description:
      "Create a UGC video brief from the confirmation card. Reward is 500 to 50000 cents per accepted video. Take it from the company or from ugc_price_range; do not invent a price.",
    input: z
      .object({
        companyId: id,
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
      })
      .strict(),
    access: "user" as const,
    confirm: write,
    async run(
      ctx: Ctx,
      input: {
        companyId: string;
        productName: string;
        productSummary: string;
        goal: (typeof UGC_GOALS)[number];
        niches: (typeof UGC_NICHES)[number][];
        audience: string;
        country: string | null;
        languages: string[];
        mustSay: string;
        mustNot: string;
        platforms: (typeof UGC_PLATFORMS)[number][];
        videosWanted: number;
        bountyMinor: string;
        deadline: string;
        rights: (typeof UGC_RIGHTS)[number];
        pitch: string;
        exampleUrls: string[];
      },
    ) {
      assertUgcTopic(ctx);
      return {
        llm: model(
          await createCampaign(ctx.userId, {
            ...input,
            bountyMinor: BigInt(input.bountyMinor),
          }),
        ),
      };
    },
  },
  {
    name: "apply_ugc_campaign",
    description: "Apply to an open brief. This is not a hire.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { campaignId: string }) {
      assertUgcTopic(ctx);
      return {
        llm: model(await applyToCampaign(ctx.userId, input.campaignId)),
      };
    },
  },
  {
    name: "offer_ugc_hire",
    description:
      "Offer a hire to one creator id. The card shows name, niches, reward, rights and the note.",
    input: z.object({ campaignId: id, creatorId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { campaignId: string; creatorId: string }) {
      assertUgcTopic(ctx);
      return {
        llm: model(
          await offerHire(ctx.userId, input.campaignId, input.creatorId),
        ),
      };
    },
  },
  {
    name: "accept_ugc_invite",
    description: "Accept a hire offer. A bare yes is not this call.",
    input: z.object({ inviteId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { inviteId: string }) {
      assertUgcTopic(ctx);
      return { llm: model(await acceptInvite(ctx.userId, input.inviteId)) };
    },
  },
  {
    name: "decline_ugc_invite",
    description: "Decline a hire offer.",
    input: z.object({ inviteId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { inviteId: string }) {
      assertUgcTopic(ctx);
      return { llm: model(await declineInvite(ctx.userId, input.inviteId)) };
    },
  },
  {
    name: "issue_ugc_join_link",
    description:
      "Issue a join button for the company's own creator. Do not write the token.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { campaignId: string }) {
      assertUgcTopic(ctx);
      const link = await issueJoinLink(ctx.userId, input.campaignId);
      return {
        llm: link.forModel,
        client: { kind: "ugc_join", data: { payload: link.payload } },
      };
    },
  },
  {
    name: "remind_ugc_invites",
    description:
      "Send one reminder on an offer or a hire that has no video yet.",
    input: z.object({ inviteId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { inviteId: string }) {
      assertUgcTopic(ctx);
      return { llm: model(await remindInvite(ctx.userId, input.inviteId)) };
    },
  },
  {
    name: "submit_ugc_video",
    description:
      "Submit an https link on TikTok, Instagram or YouTube. Only a hired creator.",
    input: z
      .object({
        inviteId: id,
        url: z.string().max(500),
        hook: z.string().max(300),
      })
      .strict(),
    access: "user" as const,
    confirm: write,
    async run(
      ctx: Ctx,
      input: { inviteId: string; url: string; hook: string },
    ) {
      assertUgcTopic(ctx);
      return {
        llm: model(
          await submitVideo(ctx.userId, input.inviteId, input.url, input.hook),
        ),
      };
    },
  },
  {
    name: "request_ugc_changes",
    description: "Ask for the one revision. A second call is refused.",
    input: z.object({ inviteId: id, note: z.string().max(500) }).strict(),
    access: "user" as const,
    confirm: write,
    async run(ctx: Ctx, input: { inviteId: string; note: string }) {
      assertUgcTopic(ctx);
      return {
        llm: model(
          await requestChanges(ctx.userId, input.inviteId, input.note),
        ),
      };
    },
  },
  {
    name: "decide_ugc_submission",
    description:
      "Accept, reject, or mark an ad winner. Do not choose a winner yourself.",
    input: z
      .object({ inviteId: id, to: z.enum(["accepted", "rejected", "winner"]) })
      .strict(),
    access: "user" as const,
    confirm: write,
    async run(
      ctx: Ctx,
      input: { inviteId: string; to: "accepted" | "rejected" | "winner" },
    ) {
      assertUgcTopic(ctx);
      return {
        llm: model(
          await decideSubmission(ctx.userId, input.inviteId, input.to),
        ),
      };
    },
  },
  {
    name: "get_ugc_winners",
    description:
      "Read winners and the view counts the creator reported. Call every count reported. Do not fetch the links and do not treat a count as checked.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: read,
    async run(ctx: Ctx, input: { campaignId: string }) {
      return { llm: model(await listWinners(ctx.userId, input.campaignId)) };
    },
  },
  {
    name: "set_ugc_status",
    description:
      "Pause an open brief, resume a paused one, or close an open or paused one, by campaignId from get_my_ugc_campaigns. Paused: no new applications or hires; hired creators still hand in videos and the company decides them. Closed: new applications and videos stop for good. A request to delete or remove an open brief is close. Only a member of the brief's company. Confirmed on a card.",
    input: z
      .object({
        campaignId: id,
        action: z.enum(["pause", "resume", "close"]),
      })
      .strict(),
    access: "user" as const,
    confirm: write,
    async preview(ctx: Ctx, input: { campaignId: string }) {
      return ownBriefName(ctx, input.campaignId);
    },
    async run(
      ctx: Ctx,
      input: { campaignId: string; action: "pause" | "resume" | "close" },
    ) {
      if (input.action === "close")
        return {
          llm: model(await closeCampaign(ctx.userId, input.campaignId)),
        };
      return {
        llm: model(
          await setCampaignPaused(
            ctx.userId,
            input.campaignId,
            input.action === "pause",
          ),
        ),
      };
    },
  },
  {
    name: "propose_ugc_update",
    description:
      "Change the text of an open or paused brief, by campaignId from get_my_ugc_campaigns: productSummary (what it is, up to 400), pitch (up to 300, no contacts), mustSay and mustNot (up to 1000 each), exampleUrls (https, up to 5; replaces the list). Send only what they asked to change. Reward, rights, the number of videos, platforms and the deadline do not change: hired creators agreed to them; for those, close the brief and collect a new one. Confirmed on a card.",
    input: z
      .object({
        campaignId: id,
        productSummary: z.string().max(400).optional(),
        pitch: z.string().max(300).optional(),
        mustSay: z.string().max(1000).optional(),
        mustNot: z.string().max(1000).optional(),
        exampleUrls: z.array(z.string().max(500)).max(5).optional(),
      })
      .strict(),
    access: "user" as const,
    confirm: write,
    async preview(ctx: Ctx, input: { campaignId: string }) {
      return ownBriefName(ctx, input.campaignId);
    },
    async run(
      ctx: Ctx,
      input: {
        campaignId: string;
        productSummary?: string;
        pitch?: string;
        mustSay?: string;
        mustNot?: string;
        exampleUrls?: string[];
      },
    ) {
      const { campaignId, ...patch } = input;
      return {
        llm: model(await updateCampaignText(ctx.userId, campaignId, patch)),
      };
    },
  },
  {
    name: "withdraw_ugc_campaign",
    description:
      "Take a brief that is still in review back to the draft, by campaignId from get_my_ugc_campaigns. Creators have not seen it. All fields go back to the brief draft; the person edits it on the new brief page and sends it again. Refused when they already have an unsent draft. Confirmed on a card.",
    input: z.object({ campaignId: id }).strict(),
    access: "user" as const,
    confirm: write,
    async preview(ctx: Ctx, input: { campaignId: string }) {
      return ownBriefName(ctx, input.campaignId);
    },
    async run(ctx: Ctx, input: { campaignId: string }) {
      const result = await withdrawToDraft(ctx.userId, input.campaignId);
      return {
        llm: `${model(result)} The brief is back in the draft. To edit and send it again: offer_step campaigns.`,
      };
    },
  },
];
