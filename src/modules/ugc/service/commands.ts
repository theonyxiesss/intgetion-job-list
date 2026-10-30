import {
  checkShipment,
  deliveryState,
  UGC_DELIVERY_PROBLEMS,
  type DeliveryState,
  type ShipmentInput,
  type UgcDeliveryProblem,
} from "./delivery";
import { cleanAnswers, cleanQuestions } from "./questions";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  buildRoomFeed,
  checkRoomMessage,
  UGC_ROOM_RETENTION_DAYS,
  UGC_ROOM_WRITABLE,
  type RoomFeedItem,
  type RoomSide,
} from "./room";
import { REVIEW_STAGE_NAMES, reviewDueAt, reviewStage } from "./review-clock";
import { versionRows } from "./versions";
import { assertTermsAgreed, buildTerms, termsHash } from "./terms";
import { randomBytes, randomUUID } from "node:crypto";
import {
  UGC_GOALS,
  UGC_LIMITS as L,
  UGC_NICHES,
  UGC_PLATFORMS,
  UGC_DECLINE_REASONS,
  UGC_DISPUTE_OUTCOMES,
  UGC_DISPUTE_REASONS,
  UGC_PHYSICAL_LIVE,
  UGC_REPORT_REASONS,
  UGC_RIGHTS,
  type UgcDeclineReason,
  type UgcDisputeOutcome,
  type UgcDisputeReason,
  type UgcReportReason,
  type UgcNiche,
  type UgcPlatform,
  type UgcRights,
  type UgcSubmissionStatus,
} from "@/config/ugc";
import {
  buildCreatorWorkspace,
  type WorkspaceInput,
} from "./creator-workspace";
import {
  errorCodes,
  HttpError,
  notFound,
  rateLimited,
  unauthenticated,
  validationError,
} from "@/lib/http";
import {
  acceptsSubmissions,
  assertAcceptsNewWork,
  assertBounty,
  assertHireRoom,
  assertHired,
  assertNoContacts,
  assertOfferRoom,
  assertRevisionAvailable,
  assertReportedViews,
  assertSubmissionUrl,
  assertWinnerRights,
  creatorMatches,
  fitReasons,
  hashJoinToken,
  joinExpiresAt,
  offerExpiresAt,
  participationFromApply,
  participationFromJoin,
  profileReady,
  UGC_ERRORS,
} from "./rules";
import {
  checkCampaignTransition,
  checkParticipationTransition,
  checkSubmissionTransition,
} from "./transitions";
import type {
  BriefInput,
  Campaign,
  CreatorProfile,
  Dispute,
  Invite,
  Payout,
  ProfileInput,
  RoomMessage,
  Shipment,
  Submission,
  SubmissionVersion,
} from "./records";
import type { UgcStore } from "./store";
import { priceGuide, ugcBudgetMinor } from "./pricing";
import { campaignProgress, countParticipants } from "./progress";
import { assertBudgetRoom, committedMinor } from "./escrow-rules";
import { escrowOn } from "./escrow-gate";

/**
 * Rules live in `rules.ts`. This file is the only write path (27.8, 27.17):
 * the pages and the bot both call these functions.
 */
let injected: UgcStore | null = null;

export function useUgcStore(store: UgcStore | null) {
  injected = store;
}

/** The store for this module's other services (escrow). Not exported from index. */
export async function db(): Promise<UgcStore> {
  if (injected) return injected;
  const { productionUgcStore } = await import("../repo/ugc-repo");
  return productionUgcStore();
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDay: string, count: number): string {
  const date = new Date(`${isoDay}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return day(date);
}

const LANG = /^[a-z]{2}(-[A-Z]{2})?$/;
const COUNTRY = /^[A-Z]{2}$/;

function asList<T extends string>(
  values: readonly string[],
  allowed: readonly T[],
  field: string,
): T[] {
  if (
    values.length === 0 ||
    values.some((item) => !allowed.includes(item as T))
  ) {
    throw validationError([{ path: field, problem: "invalid" }]);
  }
  return [...new Set(values)] as T[];
}

function httpsExamples(urls: readonly string[]): string[] {
  if (urls.length > L.exampleLinksMax) {
    throw validationError([{ path: "exampleUrls", problem: "too_many" }]);
  }
  for (const url of urls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw validationError([{ path: "exampleUrls", problem: "url" }]);
    }
    if (parsed.protocol !== "https:") {
      throw validationError([{ path: "exampleUrls", problem: "url" }]);
    }
  }
  return [...urls];
}

function requireUser(userId: string | null): string {
  if (!userId) throw unauthenticated();
  return userId;
}

/** No chat utterance hires or picks a winner. Only the confirmation card does (27.8). */
export function decisionFromUtterance(text: string): null {
  void text;
  return null;
}

/** A services thread cannot write a campaign until the campaigns card is open. */
export function campaignWriteAllowed(topic: string | undefined): boolean {
  return topic === "ugc";
}

/** Public card. No email, phone, Telegram, wallet, or join token. */
export function publicCreatorCard(profile: CreatorProfile) {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    languages: profile.languages,
    platforms: profile.platforms,
    niches: profile.niches,
    country: profile.country,
    exampleUrls: profile.exampleUrls,
  };
}

/** A recorded price. `sent` stays false: the platform does not transfer it. */
export function moneyRecord(row: Payout | null) {
  if (!row) return null;
  return {
    amountMinor: row.amountMinor.toString(),
    status: row.status,
    charged: false as const,
    sent: false as const,
  };
}

/** View counts stay labeled reported. The page is never fetched (phase B). */
export function forReader(row: Submission | null) {
  if (!row) return null;
  return {
    status: row.status,
    url: row.url,
    hook: row.hook,
    changeNote: row.changeNote,
    liveUrl: row.liveUrl,
    reportedViews: row.reportedViews,
    viewsSource: "reported" as const,
    /** The company said the link does not open; the creator may send another. */
    linkReported: Boolean(row.linkReportedAt),
    /** When the company must decide, while the video waits for it (D574). */
    reviewDueAt:
      row.status === "submitted" && row.submittedAt
        ? reviewDueAt(row.submittedAt).toISOString()
        : null,
  };
}

export function briefForReaders(campaign: Campaign) {
  return {
    id: campaign.id,
    productName: campaign.productName,
    productSummary: campaign.productSummary,
    goal: campaign.goal,
    niches: campaign.niches,
    audience: campaign.audience,
    country: campaign.country,
    countries:
      campaign.countries ?? (campaign.country ? [campaign.country] : []),
    languages: campaign.languages,
    mustSay: campaign.mustSay,
    mustNot: campaign.mustNot,
    platforms: campaign.platforms,
    videosWanted: campaign.videosWanted,
    bountyMinor: campaign.bountyMinor.toString(),
    deadline: campaign.deadline,
    rights: campaign.rights,
    status: campaign.status,
    questions: campaign.questions ?? [],
  };
}

function validateBrief(input: BriefInput, today: string): BriefInput {
  const productName = input.productName.trim();
  const productSummary = input.productSummary.trim();
  const audience = input.audience.trim();
  const mustSay = input.mustSay.trim();
  const mustNot = input.mustNot.trim();
  const pitch = input.pitch.trim();
  if (
    !productName ||
    !productSummary ||
    !audience ||
    !mustSay ||
    !mustNot ||
    productName.length > 120 ||
    productSummary.length > 400 ||
    audience.length > 300 ||
    mustSay.length > 1000 ||
    mustNot.length > 1000
  ) {
    throw validationError([{ path: "brief", problem: "required" }]);
  }
  if (!UGC_GOALS.includes(input.goal)) {
    throw validationError([{ path: "goal", problem: "invalid" }]);
  }
  if (!UGC_RIGHTS.includes(input.rights)) {
    throw validationError([{ path: "rights", problem: "invalid" }]);
  }
  if (
    !Number.isInteger(input.videosWanted) ||
    input.videosWanted < L.videosMin ||
    input.videosWanted > L.videosMax
  ) {
    throw validationError([{ path: "videosWanted", problem: "range" }]);
  }
  assertBounty(input.bountyMinor);
  if (pitch.length > L.pitchMax) {
    throw validationError([{ path: "pitch", problem: "length" }]);
  }
  assertNoContacts(pitch, "pitch");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.deadline) || input.deadline < today) {
    throw validationError([{ path: "deadline", problem: "date" }]);
  }
  const languages = [...new Set(input.languages)];
  if (languages.length === 0 || languages.some((code) => !LANG.test(code))) {
    throw validationError([{ path: "languages", problem: "invalid" }]);
  }
  if (input.country !== null && !COUNTRY.test(input.country)) {
    throw validationError([{ path: "country", problem: "invalid" }]);
  }
  const countries = [
    ...new Set(input.countries ?? (input.country ? [input.country] : [])),
  ];
  if (countries.length > 20 || countries.some((code) => !COUNTRY.test(code))) {
    throw validationError([{ path: "countries", problem: "invalid" }]);
  }
  return {
    ...input,
    productName,
    productSummary,
    audience,
    mustSay,
    mustNot,
    pitch,
    languages,
    countries,
    niches: asList(input.niches, UGC_NICHES, "niches"),
    platforms: asList(input.platforms, UGC_PLATFORMS, "platforms"),
    exampleUrls: httpsExamples(input.exampleUrls),
  };
}

async function requireMember(
  store: UgcStore,
  companyId: string,
  userId: string,
) {
  const role = await store.memberRole(companyId, userId);
  if (!role) throw notFound();
  return role;
}

export async function campaignForMember(
  store: UgcStore,
  campaignId: string,
  userId: string,
) {
  const campaign = await store.getCampaign(campaignId);
  if (!campaign) throw notFound();
  await requireMember(store, campaign.companyId, userId);
  return campaign;
}

export async function saveCreatorProfile(
  userId: string | null,
  input: ProfileInput,
) {
  const id = requireUser(userId);
  const store = await db();
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 80) {
    throw validationError([{ path: "displayName", problem: "length" }]);
  }
  const languages = [...new Set(input.languages)];
  if (languages.some((code) => !LANG.test(code))) {
    throw validationError([{ path: "languages", problem: "invalid" }]);
  }
  if (input.country !== null && !COUNTRY.test(input.country)) {
    throw validationError([{ path: "country", problem: "invalid" }]);
  }
  const ready = profileReady({
    displayName,
    languages,
    platforms: input.platforms,
    niches: input.niches,
  });
  const profile: CreatorProfile = {
    userId: id,
    displayName,
    languages,
    platforms: asList(input.platforms, UGC_PLATFORMS, "platforms"),
    niches: asList(input.niches, UGC_NICHES, "niches"),
    country: input.country,
    exampleUrls: httpsExamples(input.exampleUrls),
    inviteOptIn: ready ? input.inviteOptIn : false,
    status: input.status === "paused" ? "paused" : "active",
  };
  if (!ready) profile.inviteOptIn = false;
  await store.saveProfile(profile);
  return { profile: publicCreatorCard(profile), ready };
}

/** The creator's own full profile, for their form (D504). */
export async function getOwnCreatorProfile(
  userId: string | null,
): Promise<CreatorProfile | null> {
  const id = requireUser(userId);
  return (await db()).getProfile(id);
}

export async function getMyCreatorProfile(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const profile = await store.getProfile(id);
  if (!profile) return { profile: null, ready: false, gaps: ["profile"] };
  const ready = profileReady(profile);
  const gaps = [
    profile.displayName ? null : "displayName",
    profile.languages.length ? null : "languages",
    profile.platforms.length ? null : "platforms",
    profile.niches.length ? null : "niches",
  ].filter((item) => item !== null);
  return { profile: publicCreatorCard(profile), ready, gaps };
}

/** Creates a brief and sends it to review when the fields are complete. */
export async function createCampaign(userId: string | null, input: BriefInput) {
  const id = requireUser(userId);
  const store = await db();
  const now = store.now();
  const brief = validateBrief(input, day(now));
  await requireMember(store, brief.companyId, id);
  const since = new Date(now.getTime() - 60 * 60 * 1000);
  if (
    (await store.countCreatedSince(brief.companyId, since)) >=
    L.draftsPerCompanyPerHour
  ) {
    throw rateLimited(60 * 60);
  }
  const campaign: Campaign = {
    id: randomUUID(),
    companyId: brief.companyId,
    createdBy: id,
    status: "draft",
    productName: brief.productName,
    productSummary: brief.productSummary,
    goal: brief.goal,
    niches: brief.niches,
    audience: brief.audience,
    country: brief.country,
    countries: brief.countries ?? [],
    languages: brief.languages,
    mustSay: brief.mustSay,
    mustNot: brief.mustNot,
    platforms: brief.platforms,
    videosWanted: brief.videosWanted,
    bountyMinor: brief.bountyMinor,
    deadline: brief.deadline,
    rights: brief.rights,
    pitch: brief.pitch,
    exampleUrls: brief.exampleUrls,
    questions: cleanQuestions(brief.questions ?? []),
    createdAt: now,
  };
  checkCampaignTransition({
    from: "draft",
    to: "pending_review",
    actor: "company",
  });
  campaign.status = "pending_review";
  await store.insertCampaign(campaign);
  return { id: campaign.id, status: campaign.status };
}

export async function listMyCampaigns(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const companies = await store.companiesFor(id);
  const rows = await store.listByCompanies(companies.map((row) => row.id));
  return rows.map((row) => ({
    id: row.id,
    productName: row.productName,
    status: row.status,
    deadline: row.deadline,
    bountyMinor: row.bountyMinor.toString(),
  }));
}

export async function readCampaign(userId: string | null, campaignId: string) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await store.getCampaign(campaignId);
  if (!campaign) throw notFound();
  const member = await store.memberRole(campaign.companyId, id);
  if (member) {
    const invites = await store.listInvites(campaign.id);
    const submissions = await store.listSubmissions(
      invites.map((row) => row.id),
    );
    const profiles = await Promise.all(
      invites.map((row) => store.getProfile(row.creatorUserId)),
    );
    return {
      role: "company" as const,
      brief: {
        ...briefForReaders(campaign),
        pitch: campaign.pitch,
        exampleUrls: campaign.exampleUrls,
      },
      versions: (await store.listCampaignVersions(campaign.id)).map((row) => ({
        version: row.version,
        changedFields: row.changedFields,
        snapshot: row.snapshot,
        at: row.createdAt.toISOString(),
      })),
      participants: await Promise.all(
        invites.map(async (invite, index) => {
          const submission =
            submissions.find((row) => row.inviteId === invite.id) ?? null;
          return {
            inviteId: invite.id,
            status: invite.status,
            bountyMinor: invite.bountyMinor?.toString() ?? null,
            rights: invite.rights,
            pitch: invite.pitch,
            /** What the company offered and the creator agreed to (U3). */
            terms: invite.terms ?? null,
            termsChanged:
              !!invite.termsHash &&
              invite.status === "offered" &&
              termsHash(buildTerms(campaign)) !== invite.termsHash,
            reminders: invite.reminders,
            revisionUsed: invite.revisionUsed,
            shortlisted: invite.shortlisted ?? false,
            answers: invite.answers ?? [],
            declineReason: invite.declineReason ?? null,
            creator: profiles[index]
              ? publicCreatorCard(profiles[index])
              : null,
            submission: forReader(submission),
            linkVersions: await linkVersionsOf(store, submission),
            payout: moneyRecord(
              submission
                ? await store.getPayoutBySubmission(submission.id)
                : null,
            ),
          };
        }),
      ),
    };
  }
  const invite = await store.findInvite(campaign.id, id);
  if (!invite) throw notFound();
  const submission = await store.getSubmission(invite.id);
  return {
    role: "creator" as const,
    brief: briefForReaders(campaign),
    invite: {
      id: invite.id,
      status: invite.status,
      bountyMinor: invite.bountyMinor?.toString() ?? null,
      rights: invite.rights,
      pitch: invite.pitch,
      declineReason: invite.declineReason ?? null,
      terms: invite.terms ?? null,
      termsHash: invite.termsHash ?? null,
      /** The brief no longer says what the offer said: the creator cannot accept it. */
      termsChanged:
        !!invite.termsHash &&
        invite.status === "offered" &&
        termsHash(buildTerms(campaign)) !== invite.termsHash,
      agreedAt: invite.agreedAt?.toISOString() ?? null,
    },
    submission: forReader(submission),
    linkVersions: await linkVersionsOf(store, submission),
    payout: moneyRecord(
      submission ? await store.getPayoutBySubmission(submission.id) : null,
    ),
  };
}

export async function decideCampaign(input: {
  adminId: string | null;
  isAdmin: boolean;
  campaignId: string;
  to: "open" | "rejected";
}) {
  if (!input.isAdmin) throw notFound();
  const adminId = requireUser(input.adminId);
  const store = await db();
  const campaign = await store.getCampaign(input.campaignId);
  if (!campaign) throw notFound();
  checkCampaignTransition({
    from: campaign.status,
    to: input.to,
    actor: "admin",
  });
  campaign.status = input.to;
  await store.saveCampaign(campaign);
  await store.audit(
    adminId,
    input.to === "open" ? "ugc.campaign_open" : "ugc.campaign_reject",
    campaign.id,
  );
  await store.notify({
    type: "ugc.campaign_decided",
    userIds: [campaign.createdBy],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      decision: input.to,
    },
    email: true,
  });
  return { status: campaign.status };
}

export async function listOpenCampaigns(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const profile = await store.getProfile(id);
  if (!profile || !profileReady(profile)) return [];
  const today = day(store.now());
  const rows = await store.listOpen();
  return rows
    .filter((row) => row.status === "open" && row.deadline >= today)
    .map((row) => ({
      id: row.id,
      productName: row.productName,
      niches: row.niches,
      platforms: row.platforms,
      countries: row.countries ?? (row.country ? [row.country] : []),
      bountyMinor: row.bountyMinor.toString(),
      rights: row.rights,
      deadline: row.deadline,
      questions: row.questions ?? [],
    }));
}

const MATCH_LIMIT = 10;

/**
 * Open briefs that fit this creator (D499): the 27.7 rule seen from the
 * creator, without briefs they already joined and past the deadline. More
 * shared niches first, then the nearer deadline, then the higher reward.
 * `all` lists every open brief instead, for "show me everything".
 */
export async function matchOpenCampaigns(
  userId: string | null,
  options: { all?: boolean } = {},
) {
  const id = requireUser(userId);
  const store = await db();
  const profile = await store.getProfile(id);
  if (!profile || !profileReady(profile))
    return { profileReady: false as const, openTotal: 0, briefs: [] };
  const today = day(store.now());
  const joined = new Set(
    (await store.listInvitesForCreator(id)).map((row) => row.campaignId),
  );
  const open = (await store.listOpen()).filter(
    (row) =>
      row.status === "open" && row.deadline >= today && !joined.has(row.id),
  );
  const fitted = open
    .map((row) => ({
      row,
      why: fitReasons(
        {
          platforms: row.platforms,
          languages: row.languages,
          niches: row.niches,
          country: row.country,
          countries: row.countries,
        },
        {
          platforms: profile.platforms,
          languages: profile.languages,
          niches: profile.niches,
          country: profile.country,
        },
      ),
    }))
    .filter((item) => options.all || item.why !== null)
    .sort(
      (a, b) =>
        (b.why?.niches.length ?? -1) - (a.why?.niches.length ?? -1) ||
        a.row.deadline.localeCompare(b.row.deadline) ||
        (b.row.bountyMinor > a.row.bountyMinor
          ? 1
          : b.row.bountyMinor < a.row.bountyMinor
            ? -1
            : 0),
    )
    .slice(0, options.all ? undefined : MATCH_LIMIT);
  return {
    profileReady: true as const,
    openTotal: open.length,
    briefs: fitted.map(({ row, why }) => ({
      id: row.id,
      productName: row.productName,
      niches: row.niches,
      platforms: row.platforms,
      languages: row.languages,
      countries: row.countries ?? (row.country ? [row.country] : []),
      bountyMinor: row.bountyMinor.toString(),
      rights: row.rights,
      deadline: row.deadline,
      why,
    })),
  };
}

export async function listMyInvites(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const invites = await store.listInvitesForCreator(id);
  const rows = [];
  for (const invite of invites) {
    const campaign = await store.getCampaign(invite.campaignId);
    if (!campaign) continue;
    rows.push({
      inviteId: invite.id,
      campaignId: campaign.id,
      productName: campaign.productName,
      status: invite.status,
      bountyMinor: invite.bountyMinor?.toString() ?? null,
      rights: invite.rights,
      deadline: campaign.deadline,
    });
  }
  return rows;
}

/**
 * The creator's workspace (TZ 48 U1): what needs the creator now, the
 * deadlines and the money, from the creator's own invites only. At most 100
 * invites are read; the page that pages them is U2.
 */
export async function getCreatorWorkspace(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const invites = (await store.listInvitesForCreator(id)).slice(0, 100);
  const rows: WorkspaceInput["rows"][number][] = [];
  for (const invite of invites) {
    const campaign = await store.getCampaign(invite.campaignId);
    if (!campaign) continue;
    const submission = await store.getSubmission(invite.id);
    const payout = submission
      ? await store.getPayoutBySubmission(submission.id)
      : null;
    rows.push({
      invite: {
        id: invite.id,
        status: invite.status,
        bountyMinor: invite.bountyMinor,
      },
      campaign: {
        id: campaign.id,
        status: campaign.status,
        productName: campaign.productName,
        deadline: campaign.deadline,
      },
      submission: submission ? { status: submission.status } : null,
      payout: payout
        ? { status: payout.status, amountMinor: payout.amountMinor }
        : null,
    });
  }
  return buildCreatorWorkspace({ today: day(store.now()), rows });
}

async function requireReadyCreator(store: UgcStore, userId: string) {
  if (await store.isBlocked(userId)) throw notFound();
  const profile = await store.getProfile(userId);
  if (!profile || !profileReady(profile)) {
    throw new HttpError(
      409,
      errorCodes.profileIncomplete,
      "Finish the creator profile first",
    );
  }
  if (profile.status !== "active") {
    throw new HttpError(
      409,
      "CREATOR_PAUSED",
      "This creator profile is paused",
    );
  }
  return profile;
}

export async function applyToCampaign(
  userId: string | null,
  campaignId: string,
  answers?: string[],
) {
  const id = requireUser(userId);
  const store = await db();
  const profile = await requireReadyCreator(store, id);
  const campaign = await store.getCampaign(campaignId);
  if (!campaign || campaign.status !== "open") throw notFound();
  assertAcceptsNewWork({
    status: campaign.status,
    deadline: campaign.deadline,
    today: day(store.now()),
  });
  const existing = await store.findInvite(campaign.id, id);
  if (existing) return { inviteId: existing.id, status: existing.status };
  const given = cleanAnswers(campaign.questions ?? [], answers);
  const invite: Invite = {
    id: randomUUID(),
    campaignId: campaign.id,
    creatorUserId: id,
    status: participationFromApply(),
    answers: given,
    bountyMinor: null,
    rights: null,
    pitch: "",
    reminders: 0,
    revisionUsed: false,
    deadlineNoted: false,
    offeredAt: null,
    createdAt: store.now(),
  };
  await store.insertInvite(invite);
  await store.notify({
    type: "ugc.application",
    userIds: await store.memberIds(campaign.companyId),
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return {
    inviteId: invite.id,
    status: invite.status,
    creator: publicCreatorCard(profile),
  };
}

export async function previewMatches(
  userId: string | null,
  campaignId: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  if (campaign.status !== "open") return [];
  const profiles = await store.listOptInProfiles();
  const cards = [];
  for (const profile of profiles) {
    if (
      !creatorMatches(
        {
          platforms: campaign.platforms,
          languages: campaign.languages,
          niches: campaign.niches,
          country: campaign.country,
          countries: campaign.countries,
        },
        {
          platforms: profile.platforms,
          languages: profile.languages,
          niches: profile.niches,
          country: profile.country,
          status: profile.status,
          blocked: await store.isBlocked(profile.userId),
        },
      )
    ) {
      continue;
    }
    cards.push(publicCreatorCard(profile));
  }
  return cards;
}

export async function offerHire(
  userId: string | null,
  campaignId: string,
  creatorId: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const now = store.now();
  const campaign = await campaignForMember(store, campaignId, id);
  assertAcceptsNewWork({
    status: campaign.status,
    deadline: campaign.deadline,
    today: day(now),
  });
  const profile = await store.getProfile(creatorId);
  if (!profile) throw notFound();
  const invites = await store.listInvites(campaign.id);
  const hired = invites.filter((row) => row.status === "hired").length;
  const terms = buildTerms(campaign);
  const hash = termsHash(terms);
  const staleOffer = invites.find(
    (row) =>
      row.creatorUserId === creatorId &&
      row.status === "offered" &&
      row.termsHash &&
      row.termsHash !== hash,
  );
  const openOffers = invites.filter(
    (row) => row.status === "offered" && row !== staleOffer,
  ).length;
  assertOfferRoom({
    offersToCreatorToday: await store.offersToCreatorOnDay(creatorId, day(now)),
    openOffers,
    hired,
    videosWanted: campaign.videosWanted,
  });
  const existing = invites.find((row) => row.creatorUserId === creatorId);
  if (existing && existing.status !== "applied" && existing !== staleOffer) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This creator already has an answer",
    );
  }
  if (escrowOn()) {
    assertBudgetRoom({
      depositMinor: await store.confirmedDepositMinor(campaign.id),
      committedMinor: committedMinor(invites, campaign.bountyMinor),
    });
  }
  if (!existing) {
    const matches = creatorMatches(
      {
        platforms: campaign.platforms,
        languages: campaign.languages,
        niches: campaign.niches,
        country: campaign.country,
        countries: campaign.countries,
      },
      {
        platforms: profile.platforms,
        languages: profile.languages,
        niches: profile.niches,
        country: profile.country,
        status: profile.status,
        blocked: await store.isBlocked(creatorId),
      },
    );
    if (!matches || !profile.inviteOptIn) throw notFound();
  } else if (existing !== staleOffer) {
    checkParticipationTransition({
      from: "applied",
      to: "offered",
      actor: "company",
    });
  }
  const invite: Invite = existing ?? {
    id: randomUUID(),
    campaignId: campaign.id,
    creatorUserId: creatorId,
    status: "applied",
    bountyMinor: null,
    rights: null,
    pitch: "",
    reminders: 0,
    revisionUsed: false,
    deadlineNoted: false,
    offeredAt: null,
    createdAt: now,
  };
  invite.status = "offered";
  invite.bountyMinor = campaign.bountyMinor;
  invite.rights = campaign.rights;
  invite.pitch = campaign.pitch;
  invite.offeredAt = now;
  invite.terms = terms;
  invite.termsHash = hash;
  invite.agreedHash = null;
  invite.agreedAt = null;
  if (existing) await store.saveInvite(invite);
  else await store.insertInvite(invite);
  await store.notify({
    type: "ugc.invite",
    userIds: [creatorId],
    payload: {
      campaignId: campaign.id,
      inviteId: invite.id,
      productName: campaign.productName,
      bountyMinor: campaign.bountyMinor.toString(),
    },
    email: profile.inviteOptIn,
  });
  return {
    inviteId: invite.id,
    status: invite.status,
    creator: publicCreatorCard(profile),
    bountyMinor: invite.bountyMinor.toString(),
    rights: invite.rights,
    pitch: invite.pitch,
    expiresAt: offerExpiresAt(now).toISOString(),
  };
}

async function inviteForCreator(
  store: UgcStore,
  inviteId: string,
  userId: string,
) {
  const invite = await store.getInvite(inviteId);
  if (!invite || invite.creatorUserId !== userId) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  return { invite, campaign };
}

export async function acceptInvite(
  userId: string | null,
  inviteId: string,
  termsSeen?: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const { invite, campaign } = await inviteForCreator(store, inviteId, id);
  assertAcceptsNewWork({
    status: campaign.status,
    deadline: campaign.deadline,
    today: day(store.now()),
  });
  const hired = (await store.listInvites(campaign.id)).filter(
    (row) => row.status === "hired",
  ).length;
  assertHireRoom(hired, campaign.videosWanted);
  checkParticipationTransition({
    from: invite.status,
    to: "hired",
    actor: "creator",
  });
  const agreed = assertTermsAgreed({
    snapshotHash: invite.termsHash ?? null,
    current: buildTerms(campaign),
    sentHash: termsSeen,
  });
  if (agreed) {
    invite.agreedHash = agreed;
    invite.agreedAt = store.now();
  }
  invite.status = "hired";
  await store.saveInvite(invite);
  await store.notify({
    type: "ugc.application",
    userIds: await store.memberIds(campaign.companyId),
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return { status: invite.status };
}

/**
 * The company's shortlist mark on an application (U3б, TZ 48 §6). Only the
 * company's members, only while the creator has applied and nothing was
 * offered. The creator is not told and nothing is hired or sent.
 */
export async function setShortlist(
  userId: string | null,
  inviteId: string,
  on: boolean,
) {
  const id = requireUser(userId);
  const store = await db();
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  await campaignForMember(store, campaign.id, id);
  if (invite.status !== "applied") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "Only an application can be shortlisted",
    );
  }
  invite.shortlisted = on;
  await store.saveInvite(invite);
  await store.audit(
    id,
    on ? "ugc.shortlist_add" : "ugc.shortlist_remove",
    invite.id,
  );
  return { inviteId: invite.id, shortlisted: on };
}

/**
 * The company turns an application down with a reason from a short safe list
 * (U3б, TZ 48 §6). Only an application; an offer or a hire is not touched.
 * The creator is told the result and the reason code, never a free text.
 */
export async function rejectApplication(
  userId: string | null,
  inviteId: string,
  reason: UgcDeclineReason,
) {
  const id = requireUser(userId);
  if (!UGC_DECLINE_REASONS.includes(reason)) {
    throw validationError([{ path: "reason", problem: "invalid" }]);
  }
  const store = await db();
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  await campaignForMember(store, campaign.id, id);
  checkParticipationTransition({
    from: invite.status,
    to: "declined",
    actor: "company",
  });
  invite.status = "declined";
  invite.declineReason = reason;
  invite.shortlisted = false;
  await store.saveInvite(invite);
  await store.audit(id, "ugc.application_rejected", invite.id);
  await store.notify({
    type: "ugc.application",
    userIds: [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return { inviteId: invite.id, status: invite.status, reason };
}

export async function declineInvite(userId: string | null, inviteId: string) {
  const id = requireUser(userId);
  const store = await db();
  const { invite, campaign } = await inviteForCreator(store, inviteId, id);
  checkParticipationTransition({
    from: invite.status,
    to: "declined",
    actor: "creator",
  });
  invite.status = "declined";
  await store.saveInvite(invite);
  await store.notify({
    type: "ugc.application",
    userIds: [campaign.createdBy],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return { status: invite.status };
}

export async function submitVideo(
  userId: string | null,
  inviteId: string,
  url: string,
  hook: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const { invite, campaign } = await inviteForCreator(store, inviteId, id);
  assertHired(invite.status);
  // A paused brief still takes the hired creators' videos (D512).
  if (
    !acceptsSubmissions({
      status: campaign.status,
      deadline: campaign.deadline,
      today: day(store.now()),
    })
  )
    assertAcceptsNewWork({
      status: campaign.status,
      deadline: campaign.deadline,
      today: day(store.now()),
    });
  assertSubmissionUrl(url);
  const note = hook.trim();
  if (note.length > 300) {
    throw validationError([{ path: "hook", problem: "length" }]);
  }
  const existing = await store.getSubmission(invite.id);
  // A link the company said does not open may be replaced while it waits.
  const replacing =
    existing?.status === "submitted" && Boolean(existing.linkReportedAt);
  if (existing && existing.status !== "changes_requested" && !replacing) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This video was already submitted",
    );
  }
  const previousUrl = existing?.url ?? null;
  let saved: Submission;
  if (existing) {
    if (!replacing) {
      checkSubmissionTransition({
        from: "changes_requested",
        to: "submitted",
        actor: "creator",
      });
    }
    existing.linkReportedAt = null;
    existing.url = url;
    existing.hook = note;
    existing.status = "submitted";
    existing.submittedAt = store.now();
    existing.reviewStage = 0;
    existing.escalatedAt = null;
    await store.saveSubmission(existing);
    saved = existing;
  } else {
    const submission: Submission = {
      id: randomUUID(),
      inviteId: invite.id,
      url,
      hook: note,
      status: "submitted",
      changeNote: "",
      liveUrl: null,
      reportedViews: null,
      reportedAt: null,
      submittedAt: store.now(),
      reviewStage: 0,
      escalatedAt: null,
    };
    await store.insertSubmission(submission);
    saved = submission;
  }
  await recordLinkVersion(store, saved, previousUrl);
  await store.notify({
    type: "ugc.submission",
    userIds: await store.memberIds(campaign.companyId),
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return { status: "submitted" as const };
}

export async function requestChanges(
  userId: string | null,
  inviteId: string,
  note: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await store.getCampaign(
    (await store.getInvite(inviteId))?.campaignId ?? "",
  );
  const invite = await store.getInvite(inviteId);
  if (!invite || !campaign) throw notFound();
  await requireMember(store, campaign.companyId, id);
  assertRevisionAvailable(invite.revisionUsed);
  const submission = await store.getSubmission(invite.id);
  if (!submission || submission.status !== "submitted") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "There is no submission to revise",
    );
  }
  const text = note.trim();
  if (!text || text.length > L.changeNoteMax) {
    throw validationError([{ path: "note", problem: "length" }]);
  }
  assertNoContacts(text, "note");
  checkSubmissionTransition({
    from: "submitted",
    to: "changes_requested",
    actor: "company",
  });
  submission.status = "changes_requested";
  submission.changeNote = text;
  submission.decidedAt = store.now();
  invite.revisionUsed = true;
  await store.saveSubmission(submission);
  await store.saveInvite(invite);
  await store.notify({
    type: "ugc.submission_decided",
    userIds: [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      decision: "changes_requested",
    },
    email: true,
  });
  return { status: submission.status };
}

export async function decideSubmission(
  userId: string | null,
  inviteId: string,
  to: Extract<UgcSubmissionStatus, "accepted" | "rejected" | "winner">,
) {
  const id = requireUser(userId);
  const store = await db();
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  await requireMember(store, campaign.companyId, id);
  const submission = await store.getSubmission(invite.id);
  if (!submission || submission.status !== "submitted") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This submission has no decision waiting",
    );
  }
  if (to === "winner") {
    assertWinnerRights(invite.rights ?? campaign.rights);
  }
  checkSubmissionTransition({
    from: "submitted",
    to,
    actor: "company",
  });
  const owes = to === "accepted" || to === "winner";
  if (owes && invite.bountyMinor == null) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This hire has no recorded price",
    );
  }
  submission.status = to;
  submission.decidedAt = store.now();
  await store.saveSubmission(submission);
  if (owes) await snapshotAcceptedLink(store, submission);
  if (owes && invite.bountyMinor != null) {
    await store.insertPayout({
      id: randomUUID(),
      submissionId: submission.id,
      inviteId: invite.id,
      amountMinor: invite.bountyMinor,
      status: "owed",
      paidAt: null,
      paidBy: null,
      createdAt: store.now(),
    });
  }
  await store.notify({
    type: "ugc.submission_decided",
    userIds: [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      decision: to,
    },
    email: true,
  });
  return { status: to, charged: false as const };
}

/** The hired creator states a live post and the views they saw. Nothing is fetched. */
export async function reportLivePost(
  userId: string | null,
  inviteId: string,
  liveUrl: string,
  views: number,
) {
  const id = requireUser(userId);
  const store = await db();
  const { invite } = await inviteForCreator(store, inviteId, id);
  const submission = await store.getSubmission(invite.id);
  if (
    !submission ||
    (submission.status !== "accepted" && submission.status !== "winner")
  ) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "Views are reported after the video is accepted",
    );
  }
  assertSubmissionUrl(liveUrl);
  assertReportedViews(views);
  submission.liveUrl = liveUrl;
  submission.reportedViews = views;
  submission.reportedAt = store.now();
  await store.saveSubmission(submission);
  return {
    reportedViews: views,
    viewsSource: "reported" as const,
    charged: false as const,
  };
}

/** Winners of one brief, for a member of that company. Counts stay reported. */
export async function listWinners(userId: string | null, campaignId: string) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await store.getCampaign(campaignId);
  if (!campaign) throw notFound();
  const member = await store.memberRole(campaign.companyId, id);
  if (!member) throw notFound();
  const invites = await store.listInvites(campaign.id);
  const submissions = await store.listSubmissions(invites.map((row) => row.id));
  const winners = [];
  for (const submission of submissions) {
    if (submission.status !== "winner") continue;
    const invite = invites.find((row) => row.id === submission.inviteId);
    if (!invite) continue;
    const profile = await store.getProfile(invite.creatorUserId);
    winners.push({
      inviteId: invite.id,
      displayName: profile?.displayName ?? "",
      rights: invite.rights,
      liveUrl: submission.liveUrl,
      reportedViews: submission.reportedViews,
      viewsSource: "reported" as const,
      payout: moneyRecord(await store.getPayoutBySubmission(submission.id)),
    });
  }
  return { productName: campaign.productName, winners };
}

export async function remindInvite(userId: string | null, inviteId: string) {
  const id = requireUser(userId);
  const store = await db();
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  await requireMember(store, campaign.companyId, id);
  if (invite.reminders >= 1) {
    throw new HttpError(409, errorCodes.invalidTransition, "Already reminded");
  }
  const submission = await store.getSubmission(invite.id);
  const waiting =
    invite.status === "offered" ||
    (invite.status === "hired" && submission === null);
  if (!waiting) {
    throw new HttpError(409, errorCodes.invalidTransition, "Nothing to remind");
  }
  invite.reminders = 1;
  await store.saveInvite(invite);
  await store.notify({
    type: "ugc.deadline",
    userIds: [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
    },
    email: true,
  });
  return { reminders: 1 };
}

export async function closeCampaign(userId: string | null, campaignId: string) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  checkCampaignTransition({
    from: campaign.status,
    to: "closed",
    actor: "company",
  });
  campaign.status = "closed";
  await store.saveCampaign(campaign);
  return { status: campaign.status };
}

/**
 * Pause or resume an open brief (D512, 29.10 answer 4): no new
 * applications, hires or join links while paused; hired creators still
 * hand in videos and the company still decides them.
 */
export async function setCampaignPaused(
  userId: string | null,
  campaignId: string,
  paused: boolean,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  const to = paused ? "paused" : "open";
  checkCampaignTransition({ from: campaign.status, to, actor: "company" });
  campaign.status = to;
  await store.saveCampaign(campaign);
  await store.audit(
    id,
    `ugc.campaign_${paused ? "pause" : "resume"}`,
    campaign.id,
  );
  return { status: campaign.status, productName: campaign.productName };
}

/**
 * Take a brief back from review (D512, 29.10 answer 2). Nobody but the
 * company and the admin saw it, so it goes back to the draft: `toDraft`
 * writes the fields there first, then the brief leaves the review queue.
 * A paid-in budget would block it; the wallet is open only after review.
 */
export async function withdrawCampaign(
  userId: string | null,
  campaignId: string,
  toDraft: (campaign: Campaign) => Promise<void>,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  checkCampaignTransition({
    from: campaign.status,
    to: "draft",
    actor: "company",
  });
  if ((await store.confirmedDepositMinor(campaign.id)) !== null)
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "A brief with a paid-in budget cannot go back to the draft",
    );
  await toDraft(campaign);
  await store.deleteCampaign(campaign.id);
  await store.audit(id, "ugc.campaign_withdraw", campaign.id);
  return { status: "draft" as const, productName: campaign.productName };
}

export type BriefTextPatch = {
  productSummary?: string;
  pitch?: string;
  mustSay?: string;
  mustNot?: string;
  exampleUrls?: string[];
  questions?: string[];
};

/**
 * The texts of an open or paused brief (D512, 29.10 answer 3): what it is,
 * the pitch, what to say and not to say, example links. Reward, rights,
 * the number of videos and the deadline stay: hired creators agreed to them.
 */
export async function updateCampaignText(
  userId: string | null,
  campaignId: string,
  patch: BriefTextPatch,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  if (campaign.status !== "open" && campaign.status !== "paused")
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "Only an open or paused brief takes text changes",
    );
  const named = Object.entries(patch).filter(
    ([, value]) => value !== undefined,
  );
  if (!named.length)
    throw validationError([{ path: "brief", problem: "required" }]);
  const next = { ...campaign };
  if (patch.productSummary !== undefined) {
    const value = patch.productSummary.trim();
    if (!value || value.length > 400)
      throw validationError([{ path: "productSummary", problem: "length" }]);
    next.productSummary = value;
  }
  for (const key of ["mustSay", "mustNot"] as const) {
    if (patch[key] === undefined) continue;
    const value = patch[key]!.trim();
    if (!value || value.length > 1000)
      throw validationError([{ path: key, problem: "length" }]);
    next[key] = value;
  }
  if (patch.pitch !== undefined) {
    const value = patch.pitch.trim();
    if (value.length > L.pitchMax)
      throw validationError([{ path: "pitch", problem: "length" }]);
    assertNoContacts(value, "pitch");
    next.pitch = value;
  }
  if (patch.exampleUrls !== undefined)
    next.exampleUrls = httpsExamples(patch.exampleUrls);
  if (patch.questions !== undefined)
    next.questions = cleanQuestions(patch.questions);
  await store.saveCampaignText(next);
  await store.insertCampaignVersions(
    versionRows({
      campaignId: campaign.id,
      existing: await store.listCampaignVersions(campaign.id),
      before: campaign,
      after: next,
      changedBy: id,
      at: store.now(),
      newId: randomUUID,
    }),
  );
  await store.audit(id, "ugc.campaign_text", campaign.id);
  return { status: next.status, productName: next.productName };
}

export async function issueJoinLink(userId: string | null, campaignId: string) {
  const id = requireUser(userId);
  const store = await db();
  const now = store.now();
  const campaign = await campaignForMember(store, campaignId, id);
  if (campaign.status !== "open") throw notFound();
  const token = randomBytes(18).toString("base64url");
  const payload = `ugc_${token}`;
  await store.revokeJoinTokens(campaign.id, now);
  await store.insertJoinToken({
    campaignId: campaign.id,
    tokenHash: hashJoinToken(token),
    expiresAt: joinExpiresAt(now),
    revokedAt: null,
  });
  return {
    payload,
    forModel: "A join button is on the card. Do not write the token.",
  };
}

export async function redeemJoinToken(userId: string | null, payload: string) {
  const id = requireUser(userId);
  const token = payload.startsWith("ugc_") ? payload.slice(4) : payload;
  const store = await db();
  const row = await store.findJoinToken(hashJoinToken(token));
  if (!row || row.revokedAt || row.expiresAt <= store.now()) throw notFound();
  const campaign = await store.getCampaign(row.campaignId);
  if (!campaign) throw notFound();
  assertAcceptsNewWork({
    status: campaign.status,
    deadline: campaign.deadline,
    today: day(store.now()),
  });
  await requireReadyCreator(store, id);
  const existing = await store.findInvite(campaign.id, id);
  if (existing) return { inviteId: existing.id, status: existing.status };
  const invite: Invite = {
    id: randomUUID(),
    campaignId: campaign.id,
    creatorUserId: id,
    status: participationFromJoin(),
    bountyMinor: null,
    rights: null,
    pitch: "",
    reminders: 0,
    revisionUsed: false,
    deadlineNoted: false,
    offeredAt: null,
    createdAt: store.now(),
  };
  await store.insertInvite(invite);
  await store.notify({
    type: "ugc.application",
    userIds: await store.memberIds(campaign.companyId),
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return { inviteId: invite.id, status: invite.status };
}

/** Rewards an admin has not marked. No transfer is created. */
export async function listOwedPayouts(isAdmin: boolean) {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows = await store.listOwedPayouts();
  const listed = [];
  for (const payout of rows) {
    const invite = await store.getInvite(payout.inviteId);
    if (!invite) continue;
    const campaign = await store.getCampaign(invite.campaignId);
    const profile = await store.getProfile(invite.creatorUserId);
    listed.push({
      id: payout.id,
      productName: campaign?.productName ?? "",
      displayName: profile?.displayName ?? "",
      amountMinor: payout.amountMinor.toString(),
      status: payout.status,
      charged: false as const,
      sent: false as const,
    });
  }
  return listed;
}

/** An admin records that the reward was settled. The platform sends nothing. */
export async function markPayoutPaid(input: {
  adminId: string | null;
  isAdmin: boolean;
  payoutId: string;
}) {
  if (!input.isAdmin) throw notFound();
  const adminId = requireUser(input.adminId);
  const store = await db();
  const payout = await store.getPayout(input.payoutId);
  if (!payout) throw notFound();
  if (payout.status !== "owed") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This reward is already marked",
    );
  }
  await assertNoOpenDispute(store, payout.inviteId);
  const invite = await store.getInvite(payout.inviteId);
  if (invite && (await store.confirmedDepositMinor(invite.campaignId))) {
    throw new HttpError(
      409,
      UGC_ERRORS.txRequired,
      "This reward goes out from the campaign wallet: record its transaction",
    );
  }
  payout.status = "paid";
  payout.paidAt = store.now();
  payout.paidBy = adminId;
  await store.savePayout(payout);
  await store.audit(adminId, "ugc.payout_paid", payout.id, "ugc_payout");
  return {
    status: "paid" as const,
    charged: false as const,
    sent: false as const,
  };
}

export async function listReviewQueue(isAdmin: boolean) {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows = await store.listPendingReview();
  return rows.map((row) => ({
    id: row.id,
    productName: row.productName,
    productSummary: row.productSummary,
    bountyMinor: row.bountyMinor.toString(),
    deadline: row.deadline,
  }));
}

/** One note per invite and one to the company when the deadline is tomorrow. */
export async function noteDeadlines() {
  const store = await db();
  const today = day(store.now());
  const tomorrow = addDays(today, 1);
  const campaigns = (await store.listOpen()).filter(
    (row) => row.deadline === tomorrow,
  );
  let noted = 0;
  for (const campaign of campaigns) {
    const invites = await store.listInvites(campaign.id);
    const pending = invites.filter((row) => !row.deadlineNoted);
    if (pending.length === 0) continue;
    for (const invite of pending) {
      invite.deadlineNoted = true;
      await store.saveInvite(invite);
      await store.notify({
        type: "ugc.deadline",
        userIds: [invite.creatorUserId],
        payload: {
          campaignId: campaign.id,
          productName: campaign.productName,
        },
        email: true,
      });
      noted += 1;
    }
    await store.notify({
      type: "ugc.deadline",
      userIds: [campaign.createdBy],
      payload: {
        campaignId: campaign.id,
        productName: campaign.productName,
      },
      email: true,
    });
  }
  const expired = await expireSilentOffers(store);
  const reviews = await remindReviews(store);
  return { noted, expired, reviews };
}

/**
 * The company's review clock (U4б, D574). One reminder on the third business
 * day, one on the day before the end, and at the end support is told: an
 * audit line and a note to the company. A video is never accepted by silence.
 * A missed stage is not sent late: only the highest stage that has come is.
 */
export async function remindReviews(store: UgcStore) {
  const now = store.now();
  let reminded = 0;
  let escalated = 0;
  for (const submission of await store.listSubmissionsAwaitingReview()) {
    if (!submission.submittedAt) continue;
    const stage = reviewStage(now, submission.submittedAt);
    if (stage <= (submission.reviewStage ?? 0)) continue;
    const invite = await store.getInvite(submission.inviteId);
    const campaign = invite ? await store.getCampaign(invite.campaignId) : null;
    if (!invite || !campaign) continue;
    submission.reviewStage = stage;
    if (stage === 3) submission.escalatedAt = now;
    await store.saveSubmission(submission);
    await store.notify({
      type: "ugc.review_due",
      userIds: await store.memberIds(campaign.companyId),
      payload: {
        campaignId: campaign.id,
        productName: campaign.productName,
        inviteId: invite.id,
        stage: REVIEW_STAGE_NAMES[stage],
      },
      email: true,
    });
    if (stage === 3) {
      await store.notify({
        type: "ugc.review_late",
        userIds: [invite.creatorUserId],
        payload: {
          campaignId: campaign.id,
          productName: campaign.productName,
          inviteId: invite.id,
        },
        email: true,
      });
      await store.audit(
        invite.creatorUserId,
        "ugc.review_escalated",
        submission.id,
        "ugc_submission",
      );
      escalated += 1;
    }
    reminded += 1;
  }
  return { reminded, escalated };
}

async function expireSilentOffers(store: UgcStore) {
  const now = store.now();
  let expired = 0;
  const campaigns = await store.listOpen();
  for (const campaign of campaigns) {
    for (const invite of await store.listInvites(campaign.id)) {
      if (invite.status !== "offered" || !invite.offeredAt) continue;
      if (offerExpiresAt(invite.offeredAt) > now) continue;
      checkParticipationTransition({
        from: "offered",
        to: "expired",
        actor: "system",
      });
      invite.status = "expired";
      await store.saveInvite(invite);
      expired += 1;
    }
  }
  return expired;
}

export type { UgcNiche, UgcPlatform, UgcRights };

/**
 * Price guide for a reward (D464): what reviewed briefs of this niche and
 * platform set, or the presets. Anyone may read it; no brief is exposed.
 */
export async function ugcPriceGuide(
  filter: {
    niche?: string;
    platform?: string;
  } = {},
) {
  const store = await db();
  return priceGuide(await store.listReviewed(), filter);
}

/**
 * The member's briefs with counts and the step they are on (D464): the
 * page's step track and Spoki's "how is it going" answer read the same.
 */
export async function listMyCampaignSummaries(userId: string | null) {
  const id = requireUser(userId);
  const store = await db();
  const companies = await store.companiesFor(id);
  const rows = await store.listByCompanies(companies.map((row) => row.id));
  const wallet = escrowOn();
  const out = [];
  for (const row of rows) {
    const invites = await store.listInvites(row.id);
    const submissions = await store.listSubmissions(
      invites.map((invite) => invite.id),
    );
    const depositNeeded =
      wallet &&
      row.status === "open" &&
      (await store.confirmedDepositMinor(row.id)) === null;
    out.push({
      id: row.id,
      productName: row.productName,
      status: row.status,
      deadline: row.deadline,
      videosWanted: row.videosWanted,
      bountyMinor: row.bountyMinor.toString(),
      budgetMinor: ugcBudgetMinor(row.videosWanted, Number(row.bountyMinor)),
      progress: campaignProgress(
        row.status,
        countParticipants(invites, submissions),
        { depositNeeded },
      ),
    });
  }
  return out;
}

/** The budget line Spoki reads: no deposit row, only whether it is paid (D466). */
export async function campaignBudget(
  userId: string | null,
  campaignId: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const campaign = await campaignForMember(store, campaignId, id);
  return {
    budgetMinor: ugcBudgetMinor(
      campaign.videosWanted,
      Number(campaign.bountyMinor),
    ),
    required: escrowOn(),
    paid: (await store.confirmedDepositMinor(campaign.id)) !== null,
  };
}

const UNDEFINED_TABLE = "42P01";

/** Postgres "no such table": migration 0078 is not on the database yet. */
export function isRoomTableMissing(error: unknown): boolean {
  for (
    let current: unknown = error, depth = 0;
    current && depth < 4;
    depth += 1
  ) {
    if ((current as { code?: unknown }).code === UNDEFINED_TABLE) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function roomParty(
  store: UgcStore,
  inviteId: string,
  userId: string,
) {
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  if (invite.creatorUserId === userId) {
    return { invite, campaign, side: "creator" as const };
  }
  const role = await store.memberRole(campaign.companyId, userId);
  if (!role) throw notFound();
  return { invite, campaign, side: "company" as const };
}

export type UgcRoom = {
  /** False until migration 0078 is applied. */
  ready: boolean;
  writable: boolean;
  side: RoomSide;
  items: RoomFeedItem[];
  /** Delivery of the physical product, when the company marked it sent (U6). */
  shipment: {
    carrier: string;
    tracking: string;
    expectedDate: string | null;
    state: DeliveryState;
    problem: UgcDeliveryProblem | null;
  } | null;
  canShip: boolean;
  canConfirmReceipt: boolean;
  canReportProblem: boolean;
  /** The latest dispute of the order, as both parties see it (U7). */
  dispute: {
    status: "open" | "in_review" | "resolved";
    reason: UgcDisputeReason;
    outcome: UgcDisputeOutcome | null;
    side: RoomSide;
  } | null;
  canOpenDispute: boolean;
  /** Messages from the other party since this party last opened the room (U4). */
  unread: number;
  /** The video link and its versions, for the "Материалы" section (U5). */
  video: {
    submission: NonNullable<ReturnType<typeof forReader>>;
    versions: ReturnType<typeof linkVersionView>;
  } | null;
};

/**
 * The room of one participation for one of its two parties (U4, TZ 48 §8).
 * A stranger gets 404. Before migration 0078 the feed comes without messages
 * and posting answers 503, so the page keeps working.
 */
export async function getUgcRoom(
  userId: string | null,
  inviteId: string,
): Promise<UgcRoom> {
  const id = requireUser(userId);
  const store = await db();
  const { invite, side } = await roomParty(store, inviteId, id);
  const submission = await store.getSubmission(invite.id);
  let ready = true;
  let messages: RoomMessage[] = [];
  try {
    messages = await store.listRoomMessages(invite.id);
  } catch (error) {
    if (!isRoomTableMissing(error)) throw error;
    ready = false;
  }
  const readAt = await roomReadAt(store, invite.id, id);
  const unread = messages.filter(
    (row) =>
      row.authorId !== id &&
      !row.hiddenAt &&
      (readAt === null || row.createdAt > readAt),
  ).length;
  let shipment: Shipment | null = null;
  try {
    shipment = await store.getShipment(invite.id);
  } catch (error) {
    if (!hasPgCode(error, "42P01")) throw error;
  }
  const state = shipment ? deliveryState(shipment) : null;
  let disputes: Dispute[] = [];
  try {
    disputes = await store.listDisputes(invite.id);
  } catch (error) {
    if (!hasPgCode(error, "42P01")) throw error;
  }
  const dispute = disputes[disputes.length - 1] ?? null;
  return {
    dispute: dispute
      ? {
          status: dispute.status,
          reason: dispute.reason,
          outcome: dispute.outcome,
          side: dispute.side,
        }
      : null,
    video: submission
      ? {
          submission: forReader(submission)!,
          versions: await linkVersionsOf(store, submission),
        }
      : null,
    unread,
    canOpenDispute:
      invite.status === "hired" && (!dispute || dispute.status === "resolved"),
    ready,
    writable: ready && UGC_ROOM_WRITABLE.includes(invite.status),
    side,
    shipment: shipment
      ? {
          carrier: shipment.carrier,
          tracking: shipment.tracking,
          expectedDate: shipment.expectedDate,
          state: state!,
          problem: shipment.problem,
        }
      : null,
    canShip:
      UGC_PHYSICAL_LIVE &&
      side === "company" &&
      invite.status === "hired" &&
      (state === null || state === "problem"),
    canConfirmReceipt:
      side === "creator" &&
      invite.status === "hired" &&
      state !== null &&
      state !== "received",
    canReportProblem:
      side === "creator" && invite.status === "hired" && state === "shipped",
    items: buildRoomFeed({
      viewerId: id,
      creatorId: invite.creatorUserId,
      messages: messages.map((row) => ({
        id: row.id,
        authorId: row.authorId,
        body: row.body,
        createdAt: row.createdAt.toISOString(),
        hiddenAt: row.hiddenAt?.toISOString() ?? null,
      })),
      offeredAt: invite.offeredAt?.toISOString() ?? null,
      agreedAt: invite.agreedAt?.toISOString() ?? null,
      videoSentAt: submission?.submittedAt?.toISOString() ?? null,
      decidedAt: submission?.decidedAt?.toISOString() ?? null,
      shippedAt: shipment?.shippedAt.toISOString() ?? null,
      receivedAt: shipment?.receivedAt?.toISOString() ?? null,
      problemAt: shipment?.problemAt?.toISOString() ?? null,
      disputeOpenedAt: dispute?.createdAt.toISOString() ?? null,
      disputeResolvedAt: dispute?.resolvedAt?.toISOString() ?? null,
    }),
  };
}

/** When this party last opened the room; null before 0085 or never. */
async function roomReadAt(store: UgcStore, inviteId: string, userId: string) {
  try {
    return await store.getRoomReadAt(inviteId, userId);
  } catch (error) {
    if (isRoomTableMissing(error)) return null;
    throw error;
  }
}

/** Marks the room as read by one party, after the page showed it. */
export async function markUgcRoomRead(userId: string | null, inviteId: string) {
  const id = requireUser(userId);
  const store = await db();
  const { invite } = await roomParty(store, inviteId, id);
  try {
    await store.markRoomRead(invite.id, id, store.now());
  } catch (error) {
    if (!isRoomTableMissing(error)) throw error;
  }
}

/** One message from a party; 30 an hour per account (D574). */
export async function postUgcRoomMessage(
  userId: string | null,
  inviteId: string,
  body: string,
): Promise<UgcRoom> {
  const id = requireUser(userId);
  const store = await db();
  const { invite, campaign, side } = await roomParty(store, inviteId, id);
  const text = checkRoomMessage({ status: invite.status, body });
  await enforceRateLimit("ugcMessage", id);
  try {
    await store.insertRoomMessage({
      id: randomUUID(),
      inviteId: invite.id,
      authorId: id,
      body: text,
      hiddenAt: null,
      createdAt: store.now(),
    });
  } catch (error) {
    if (isRoomTableMissing(error)) {
      throw new HttpError(
        503,
        UGC_ERRORS.roomNotReady,
        "Messages in orders are not switched on yet",
      );
    }
    throw error;
  }
  await store.notify({
    type: "ugc.message",
    userIds:
      side === "creator"
        ? await store.memberIds(campaign.companyId)
        : [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
    },
    email: false,
  });
  return getUgcRoom(id, invite.id);
}

function hasPgCode(error: unknown, code: string): boolean {
  for (
    let current: unknown = error, depth = 0;
    current && depth < 4;
    depth += 1
  ) {
    if ((current as { code?: unknown }).code === code) return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

/**
 * A party's complaint about a message of the other side in their room (U4б,
 * D574). Only a party of that room, never about one's own message, one
 * complaint per person per message. The text stays until a moderator decides.
 */
export async function reportRoomMessage(
  userId: string | null,
  messageId: string,
  reason: UgcReportReason,
) {
  const id = requireUser(userId);
  if (!UGC_REPORT_REASONS.includes(reason)) {
    throw validationError([{ path: "reason", problem: "invalid" }]);
  }
  const store = await db();
  const message = await store.getRoomMessage(messageId);
  if (!message) throw notFound();
  await roomParty(store, message.inviteId, id);
  if (message.authorId === id) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This is your own message",
    );
  }
  await enforceRateLimit("ugcMessage", id);
  try {
    await store.insertRoomReport({
      id: randomUUID(),
      messageId: message.id,
      reporterId: id,
      reason,
      status: "open",
      createdAt: store.now(),
    });
  } catch (error) {
    if (hasPgCode(error, "23505")) {
      throw new HttpError(409, "ALREADY_REPORTED", "You already reported this");
    }
    throw error;
  }
  return { reported: true as const };
}

/** Open complaints with the text they are about, for moderators (U4б). */
export async function listRoomReportQueue(isAdmin: boolean) {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows = [];
  for (const report of await store.listOpenRoomReports()) {
    const message = await store.getRoomMessage(report.messageId);
    if (!message) continue;
    const invite = await store.getInvite(message.inviteId);
    const campaign = invite ? await store.getCampaign(invite.campaignId) : null;
    rows.push({
      id: report.id,
      reason: report.reason,
      at: report.createdAt.toISOString(),
      body: message.body,
      hidden: message.hiddenAt !== null,
      campaignId: campaign?.id ?? null,
      inviteId: message.inviteId,
      productName: campaign?.productName ?? "",
    });
  }
  return rows;
}

/** A moderator hides the message or dismisses the complaint (U4б). */
export async function decideRoomReport(input: {
  adminId: string | null;
  isAdmin: boolean;
  reportId: string;
  to: "hidden" | "dismissed";
}) {
  if (!input.isAdmin) throw notFound();
  const adminId = requireUser(input.adminId);
  const store = await db();
  const report = await store.getRoomReport(input.reportId);
  if (!report) throw notFound();
  if (report.status !== "open") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This complaint was already decided",
    );
  }
  const at = store.now();
  if (input.to === "hidden") {
    await store.hideRoomMessage(report.messageId, adminId, at);
  }
  await store.decideRoomReport(report.id, input.to, adminId, at);
  await store.audit(
    adminId,
    input.to === "hidden"
      ? "ugc.room_message_hidden"
      : "ugc.room_report_dismissed",
    report.id,
    "ugc_room_report",
  );
  return { status: input.to };
}

/** Videos whose review time ran out, for support (U4б, D574). */
export async function listEscalatedReviews(isAdmin: boolean) {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows = [];
  for (const submission of await store.listSubmissionsAwaitingReview()) {
    if (!submission.escalatedAt || !submission.submittedAt) continue;
    const invite = await store.getInvite(submission.inviteId);
    const campaign = invite ? await store.getCampaign(invite.campaignId) : null;
    if (!invite || !campaign) continue;
    rows.push({
      submissionId: submission.id,
      campaignId: campaign.id,
      inviteId: invite.id,
      productName: campaign.productName,
      dueAt: reviewDueAt(submission.submittedAt).toISOString(),
      escalatedAt: submission.escalatedAt.toISOString(),
    });
  }
  return rows.sort((a, b) => a.escalatedAt.localeCompare(b.escalatedAt));
}

/**
 * Message text stays 12 months after the order closed (D574). Zero before
 * migration 0078 is applied.
 */
export async function sweepRoomMessages(now = new Date()) {
  const store = await db();
  const cutoff = new Date(now.getTime() - UGC_ROOM_RETENTION_DAYS * 86_400_000);
  try {
    return { deleted: await store.deleteClosedRoomMessages(cutoff) };
  } catch (error) {
    if (isRoomTableMissing(error)) return { deleted: 0 };
    throw error;
  }
}

/**
 * Every link of one video, oldest first (U5, D573). Before migration 0081 the
 * table is missing: the list is empty and the page keeps working.
 */
async function linkVersionsOf(store: UgcStore, submission: Submission | null) {
  if (!submission) return [];
  try {
    return linkVersionView(await store.listSubmissionVersions(submission.id));
  } catch (error) {
    if (hasPgCode(error, "42P01")) return [];
    throw error;
  }
}

export function linkVersionView(rows: readonly SubmissionVersion[]) {
  return rows.map((row) => ({
    version: row.version,
    url: row.url,
    at: row.createdAt.toISOString(),
    accepted: row.acceptedAt !== null,
  }));
}

/** Links of many videos in one read; empty before migration 0081. */
export async function linkVersionsFor(
  store: UgcStore,
  submissionIds: readonly string[],
): Promise<Map<string, SubmissionVersion[]>> {
  try {
    return await store.listSubmissionVersionsFor(submissionIds);
  } catch (error) {
    if (hasPgCode(error, "42P01")) return new Map();
    throw error;
  }
}

/**
 * Keeps each link the creator sent. A video sent before 0081 has no rows:
 * the link it had is stored first, so the history is not missing its start.
 */
async function recordLinkVersion(
  store: UgcStore,
  submission: Submission,
  previousUrl: string | null,
) {
  try {
    const rows = await store.listSubmissionVersions(submission.id);
    let next = rows.reduce((max, row) => Math.max(max, row.version), 0);
    const at = store.now();
    if (rows.length === 0 && previousUrl) {
      next += 1;
      await store.insertSubmissionVersion({
        id: randomUUID(),
        submissionId: submission.id,
        version: next,
        url: previousUrl,
        hook: "",
        acceptedAt: null,
        createdAt: at,
      });
    }
    await store.insertSubmissionVersion({
      id: randomUUID(),
      submissionId: submission.id,
      version: next + 1,
      url: submission.url,
      hook: submission.hook,
      acceptedAt: null,
      createdAt: at,
    });
  } catch (error) {
    if (!hasPgCode(error, "42P01")) throw error;
  }
}

/** The link the company accepted is marked, so a later change cannot rewrite it. */
async function snapshotAcceptedLink(store: UgcStore, submission: Submission) {
  try {
    if ((await store.listSubmissionVersions(submission.id)).length === 0) {
      await store.insertSubmissionVersion({
        id: randomUUID(),
        submissionId: submission.id,
        version: 1,
        url: submission.url,
        hook: submission.hook,
        acceptedAt: null,
        createdAt: store.now(),
      });
    }
    await store.markSubmissionVersionAccepted(submission.id, store.now());
  } catch (error) {
    if (!hasPgCode(error, "42P01")) throw error;
  }
}

/**
 * The company says the link of a video that waits for its decision does not
 * open (U5, D573). The creator may then send another link without using the
 * included revision; the review time starts again with the new link.
 */
export async function reportBrokenLink(
  userId: string | null,
  inviteId: string,
) {
  const id = requireUser(userId);
  const store = await db();
  const invite = await store.getInvite(inviteId);
  if (!invite) throw notFound();
  const campaign = await store.getCampaign(invite.campaignId);
  if (!campaign) throw notFound();
  await requireMember(store, campaign.companyId, id);
  const submission = await store.getSubmission(invite.id);
  if (!submission || submission.status !== "submitted") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This video has no link waiting for review",
    );
  }
  if (submission.linkReportedAt) {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "The link was already reported",
    );
  }
  submission.linkReportedAt = store.now();
  await store.saveSubmission(submission);
  await store.audit(id, "ugc.link_reported", submission.id, "ugc_submission");
  await store.notify({
    type: "ugc.submission_decided",
    userIds: [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      decision: "link_broken",
    },
    email: true,
  });
  return { status: submission.status, linkReported: true as const };
}

/** The delivery marks may only be written once the creator is hired. */
async function hiredRoom(store: UgcStore, inviteId: string, userId: string) {
  const party = await roomParty(store, inviteId, userId);
  if (party.invite.status !== "hired") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "Delivery starts after the creator agreed to the order",
    );
  }
  return party;
}

/**
 * The company says the product was sent (U6, TZ 48 §8). One shipment per
 * participation; a new one is possible only after the creator reported a
 * problem. The company types the tracking number: nothing is looked up.
 */
export async function markShipped(
  userId: string | null,
  inviteId: string,
  input: ShipmentInput,
) {
  const id = requireUser(userId);
  const store = await db();
  if (!UGC_PHYSICAL_LIVE) {
    throw new HttpError(
      409,
      UGC_ERRORS.physicalOff,
      "Physical products are not switched on yet",
    );
  }
  const { invite, side } = await hiredRoom(store, inviteId, id);
  if (side !== "company") throw notFound();
  const fields = checkShipment(input, day(store.now()));
  const existing = await store.getShipment(invite.id);
  if (existing && deliveryState(existing) !== "problem") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This product was already sent",
    );
  }
  await store.saveShipment({
    inviteId: invite.id,
    ...fields,
    shippedAt: store.now(),
    receivedAt: null,
    problem: null,
    problemAt: null,
  });
  await store.audit(id, "ugc.shipment_sent", invite.id, "ugc_invite");
  return { state: "shipped" as const };
}

/** The creator says the product arrived; also after a reported problem. */
export async function confirmReceived(userId: string | null, inviteId: string) {
  const id = requireUser(userId);
  const store = await db();
  const { invite, side } = await hiredRoom(store, inviteId, id);
  if (side !== "creator") throw notFound();
  const shipment = await store.getShipment(invite.id);
  if (!shipment || deliveryState(shipment) === "received") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "There is no product waiting to be received",
    );
  }
  shipment.receivedAt = store.now();
  shipment.problem = null;
  shipment.problemAt = null;
  await store.saveShipment(shipment);
  await store.audit(id, "ugc.shipment_received", invite.id, "ugc_invite");
  return { state: "received" as const };
}

/** The creator says something is wrong with a product that was sent. */
export async function reportDeliveryProblem(
  userId: string | null,
  inviteId: string,
  reason: UgcDeliveryProblem,
) {
  const id = requireUser(userId);
  if (!UGC_DELIVERY_PROBLEMS.includes(reason)) {
    throw validationError([{ path: "reason", problem: "invalid" }]);
  }
  const store = await db();
  const { invite, side } = await hiredRoom(store, inviteId, id);
  if (side !== "creator") throw notFound();
  const shipment = await store.getShipment(invite.id);
  if (!shipment || deliveryState(shipment) !== "shipped") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "There is no sent product to report",
    );
  }
  shipment.problem = reason;
  shipment.problemAt = store.now();
  await store.saveShipment(shipment);
  await store.audit(id, "ugc.shipment_problem", invite.id, "ugc_invite");
  return { state: "problem" as const, reason };
}

/**
 * A party says something went wrong with an order (U7, TZ 48 §10). Only for a
 * hired order, one unresolved dispute at a time. It changes no status and
 * pays nothing: support looks at it and records the outcome.
 */
export async function openDispute(
  userId: string | null,
  inviteId: string,
  reason: UgcDisputeReason,
  note = "",
) {
  const id = requireUser(userId);
  if (!UGC_DISPUTE_REASONS.includes(reason)) {
    throw validationError([{ path: "reason", problem: "invalid" }]);
  }
  const text = note.trim();
  if (text.length > L.disputeNoteMax) {
    throw validationError([{ path: "note", problem: "length" }]);
  }
  assertNoContacts(text, "note");
  const store = await db();
  const { invite, campaign, side } = await roomParty(store, inviteId, id);
  if (invite.status !== "hired") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "A problem can be raised on an order the creator agreed to",
    );
  }
  await enforceRateLimit("ugcMessage", id);
  try {
    await store.insertDispute({
      id: randomUUID(),
      inviteId: invite.id,
      openedBy: id,
      side,
      reason,
      note: text,
      status: "open",
      outcome: null,
      resolvedAt: null,
      createdAt: store.now(),
    });
  } catch (error) {
    if (hasPgCode(error, "23505")) {
      throw new HttpError(
        409,
        UGC_ERRORS.disputeOpen,
        "A problem is already open on this order",
      );
    }
    if (hasPgCode(error, "42P01")) {
      throw new HttpError(
        503,
        UGC_ERRORS.disputeNotReady,
        "Problems on orders are not switched on yet",
      );
    }
    throw error;
  }
  await store.audit(id, "ugc.dispute_opened", invite.id, "ugc_invite");
  await store.notify({
    type: "ugc.dispute",
    userIds:
      side === "creator"
        ? await store.memberIds(campaign.companyId)
        : [invite.creatorUserId],
    payload: {
      campaignId: campaign.id,
      productName: campaign.productName,
      inviteId: invite.id,
      stage: "opened",
    },
    email: true,
  });
  return { status: "open" as const };
}

/** Unresolved disputes for support (U7). */
export async function listDisputeQueue(isAdmin: boolean) {
  if (!isAdmin) throw notFound();
  const store = await db();
  const rows = [];
  let disputes: Dispute[] = [];
  try {
    disputes = await store.listUnresolvedDisputes();
  } catch (error) {
    if (!hasPgCode(error, "42P01")) throw error;
  }
  for (const dispute of disputes) {
    const invite = await store.getInvite(dispute.inviteId);
    const campaign = invite ? await store.getCampaign(invite.campaignId) : null;
    if (!invite || !campaign) continue;
    rows.push({
      id: dispute.id,
      status: dispute.status,
      side: dispute.side,
      reason: dispute.reason,
      note: dispute.note,
      at: dispute.createdAt.toISOString(),
      campaignId: campaign.id,
      inviteId: invite.id,
      productName: campaign.productName,
    });
  }
  return rows;
}

/**
 * Support takes a dispute into review or closes it with an outcome (U7). The
 * outcome is a record: it does not accept or reject a video or move money.
 */
export async function decideDispute(input: {
  adminId: string | null;
  isAdmin: boolean;
  disputeId: string;
  to: "in_review" | "resolved";
  outcome?: UgcDisputeOutcome;
}) {
  if (!input.isAdmin) throw notFound();
  const adminId = requireUser(input.adminId);
  const store = await db();
  const dispute = await store.getDispute(input.disputeId);
  if (!dispute) throw notFound();
  if (dispute.status === "resolved") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This dispute was already closed",
    );
  }
  if (input.to === "in_review") {
    if (dispute.status !== "open") {
      throw new HttpError(
        409,
        errorCodes.invalidTransition,
        "This dispute is already in review",
      );
    }
    dispute.status = "in_review";
    await store.saveDispute(dispute, adminId);
    await store.audit(
      adminId,
      "ugc.dispute_in_review",
      dispute.id,
      "ugc_dispute",
    );
    return { status: "in_review" as const };
  }
  const outcome = input.outcome;
  if (!outcome || !UGC_DISPUTE_OUTCOMES.includes(outcome)) {
    throw validationError([{ path: "outcome", problem: "required" }]);
  }
  dispute.status = "resolved";
  dispute.outcome = outcome;
  dispute.resolvedAt = store.now();
  await store.saveDispute(dispute, adminId);
  await store.audit(adminId, "ugc.dispute_resolved", dispute.id, "ugc_dispute");
  const invite = await store.getInvite(dispute.inviteId);
  const campaign = invite ? await store.getCampaign(invite.campaignId) : null;
  if (invite && campaign) {
    await store.notify({
      type: "ugc.dispute",
      userIds: [
        ...(await store.memberIds(campaign.companyId)),
        invite.creatorUserId,
      ],
      payload: {
        campaignId: campaign.id,
        productName: campaign.productName,
        inviteId: invite.id,
        stage: "resolved",
      },
      email: true,
    });
  }
  return { status: "resolved" as const, outcome };
}

/** Whether a problem is open on this order; false before migration 0083. */
export async function hasOpenDispute(store: UgcStore, inviteId: string) {
  try {
    return (await store.listDisputes(inviteId)).some(
      (row) => row.status !== "resolved",
    );
  } catch (error) {
    if (hasPgCode(error, "42P01")) return false;
    throw error;
  }
}

/**
 * A reward is not marked paid while a problem is open on its order (U7): the
 * outcome may change who is owed. Support closes the problem first.
 */
export async function assertNoOpenDispute(store: UgcStore, inviteId: string) {
  if (await hasOpenDispute(store, inviteId)) {
    throw new HttpError(
      409,
      UGC_ERRORS.disputeOpenPayout,
      "A problem is open on this order: close it before paying",
    );
  }
}
