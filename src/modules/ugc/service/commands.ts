import { randomBytes, randomUUID } from "node:crypto";
import {
  UGC_GOALS,
  UGC_LIMITS as L,
  UGC_NICHES,
  UGC_PLATFORMS,
  UGC_RIGHTS,
  type UgcNiche,
  type UgcPlatform,
  type UgcRights,
  type UgcSubmissionStatus,
} from "@/config/ugc";
import {
  errorCodes,
  HttpError,
  notFound,
  rateLimited,
  unauthenticated,
  validationError,
} from "@/lib/http";
import {
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
  hashJoinToken,
  joinExpiresAt,
  offerExpiresAt,
  participationFromApply,
  participationFromJoin,
  profileReady,
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
  Invite,
  Payout,
  ProfileInput,
  Submission,
} from "./records";
import type { UgcStore } from "./store";
import { priceGuide, ugcBudgetMinor } from "./pricing";
import { campaignProgress, countParticipants } from "./progress";

/**
 * Rules live in `rules.ts`. This file is the only write path (27.8, 27.17):
 * the pages and the bot both call these functions.
 */
let injected: UgcStore | null = null;

export function useUgcStore(store: UgcStore | null) {
  injected = store;
}

async function db(): Promise<UgcStore> {
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
function moneyRecord(row: Payout | null) {
  if (!row) return null;
  return {
    amountMinor: row.amountMinor.toString(),
    status: row.status,
    charged: false as const,
    sent: false as const,
  };
}

/** View counts stay labeled reported. The page is never fetched (phase B). */
function forReader(row: Submission | null) {
  if (!row) return null;
  return {
    status: row.status,
    url: row.url,
    hook: row.hook,
    changeNote: row.changeNote,
    liveUrl: row.liveUrl,
    reportedViews: row.reportedViews,
    viewsSource: "reported" as const,
  };
}

function briefForReaders(campaign: Campaign) {
  return {
    id: campaign.id,
    productName: campaign.productName,
    productSummary: campaign.productSummary,
    goal: campaign.goal,
    niches: campaign.niches,
    audience: campaign.audience,
    country: campaign.country,
    languages: campaign.languages,
    mustSay: campaign.mustSay,
    mustNot: campaign.mustNot,
    platforms: campaign.platforms,
    videosWanted: campaign.videosWanted,
    bountyMinor: campaign.bountyMinor.toString(),
    deadline: campaign.deadline,
    rights: campaign.rights,
    status: campaign.status,
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
  return {
    ...input,
    productName,
    productSummary,
    audience,
    mustSay,
    mustNot,
    pitch,
    languages,
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

async function campaignForMember(
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
      brief: { ...briefForReaders(campaign), pitch: campaign.pitch },
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
            reminders: invite.reminders,
            revisionUsed: invite.revisionUsed,
            creator: profiles[index]
              ? publicCreatorCard(profiles[index])
              : null,
            submission: forReader(submission),
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
    },
    submission: forReader(submission),
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
      bountyMinor: row.bountyMinor.toString(),
      rights: row.rights,
      deadline: row.deadline,
    }));
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
  const invite: Invite = {
    id: randomUUID(),
    campaignId: campaign.id,
    creatorUserId: id,
    status: participationFromApply(),
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
  const openOffers = invites.filter((row) => row.status === "offered").length;
  assertOfferRoom({
    offersToCreatorToday: await store.offersToCreatorOnDay(creatorId, day(now)),
    openOffers,
    hired,
    videosWanted: campaign.videosWanted,
  });
  const existing = invites.find((row) => row.creatorUserId === creatorId);
  if (existing && existing.status !== "applied") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This creator already has an answer",
    );
  }
  if (!existing) {
    const matches = creatorMatches(
      {
        platforms: campaign.platforms,
        languages: campaign.languages,
        niches: campaign.niches,
        country: campaign.country,
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
  } else {
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

export async function acceptInvite(userId: string | null, inviteId: string) {
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
  if (existing && existing.status !== "changes_requested") {
    throw new HttpError(
      409,
      errorCodes.invalidTransition,
      "This video was already submitted",
    );
  }
  if (existing) {
    checkSubmissionTransition({
      from: "changes_requested",
      to: "submitted",
      actor: "creator",
    });
    existing.url = url;
    existing.hook = note;
    existing.status = "submitted";
    await store.saveSubmission(existing);
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
    };
    await store.insertSubmission(submission);
  }
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
  await store.saveSubmission(submission);
  if (owes && invite.bountyMinor != null) {
    await store.insertPayout({
      id: randomUUID(),
      submissionId: submission.id,
      inviteId: invite.id,
      amountMinor: invite.bountyMinor,
      status: "owed",
      paidAt: null,
      paidBy: null,
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
  return { noted, expired };
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
  const out = [];
  for (const row of rows) {
    const invites = await store.listInvites(row.id);
    const submissions = await store.listSubmissions(
      invites.map((invite) => invite.id),
    );
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
      ),
    });
  }
  return out;
}
