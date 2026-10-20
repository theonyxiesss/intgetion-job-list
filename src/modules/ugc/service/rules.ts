import { createHash } from "node:crypto";
import {
  UGC_LIMITS as L,
  UGC_SUBMISSION_HOSTS,
  type UgcNiche,
  type UgcPlatform,
  type UgcRights,
} from "@/config/ugc";
import { HttpError, validationError } from "@/lib/http";
import { redactPii } from "@/lib/llm/redact";

/** Codes of this module. Kept here so `src/lib/http` stays Claude's file. */
export const UGC_ERRORS = {
  contactsInText: "CONTACTS_IN_TEXT",
  bountyOutOfRange: "BOUNTY_OUT_OF_RANGE",
  badSubmissionUrl: "BAD_SUBMISSION_URL",
  campaignClosedToWork: "CAMPAIGN_CLOSED_TO_WORK",
  notHired: "NOT_HIRED",
  hireCap: "HIRE_CAP",
  offerCap: "OFFER_CAP",
  revisionUsed: "REVISION_USED",
  organicWinner: "ORGANIC_WINNER",
  profileIncomplete: "PROFILE_INCOMPLETE",
  creatorPaused: "CREATOR_PAUSED",
  depositRequired: "UGC_DEPOSIT_REQUIRED",
  budgetExceeded: "UGC_BUDGET_EXCEEDED",
  txRequired: "UGC_TX_REQUIRED",
  txPending: "UGC_TX_PENDING",
  txInvalid: "UGC_TX_INVALID",
  refundWait: "UGC_REFUND_WAIT",
  nothingToRefund: "UGC_NOTHING_TO_REFUND",
} as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type MatchSide = {
  platforms: readonly UgcPlatform[];
  languages: readonly string[];
  niches: readonly UgcNiche[];
  /** Null means any country. */
  country: string | null;
  countries?: readonly string[];
};

export type CreatorMatchSide = MatchSide & {
  status: "active" | "paused";
  blocked: boolean;
};

function overlap<T>(left: readonly T[], right: readonly T[]): boolean {
  const set = new Set(left);
  return right.some((item) => set.has(item));
}

/** Any campaign country matches; null on either side means any country. */
export function countryMatches(
  campaign: string | null | readonly string[],
  creator: string | null,
): boolean {
  if (creator === null || campaign === null) return true;
  return Array.isArray(campaign)
    ? campaign.length === 0 || campaign.includes(creator)
    : campaign === creator;
}

/** Platform, language, niche and country (27.7). A paused or blocked creator never matches. */
export function creatorMatches(
  campaign: MatchSide,
  creator: CreatorMatchSide,
): boolean {
  if (creator.status !== "active" || creator.blocked) return false;
  return (
    overlap(campaign.platforms, creator.platforms) &&
    overlap(campaign.languages, creator.languages) &&
    overlap(campaign.niches, creator.niches) &&
    countryMatches(
      campaign.countries?.length ? campaign.countries : campaign.country,
      creator.country,
    )
  );
}

/** What a brief and a creator share (27.7, D499): the reason a brief fits. */
export type FitReasons = {
  platforms: UgcPlatform[];
  languages: string[];
  niches: UgcNiche[];
  /** The creator's country the brief takes, or "any" when either side is open. */
  country: string;
};

function shared<T>(left: readonly T[], right: readonly T[]): T[] {
  const set = new Set(right);
  return left.filter((item) => set.has(item));
}

/**
 * The same platform, language, niche and country rule as creatorMatches,
 * seen from the creator, with what matched. Null when the brief does not fit.
 */
export function fitReasons(
  campaign: MatchSide,
  creator: MatchSide,
): FitReasons | null {
  const platforms = shared(campaign.platforms, creator.platforms);
  const languages = shared(campaign.languages, creator.languages);
  const niches = shared(campaign.niches, creator.niches);
  const countries = campaign.countries?.length
    ? campaign.countries
    : campaign.country;
  if (
    !platforms.length ||
    !languages.length ||
    !niches.length ||
    !countryMatches(countries, creator.country)
  )
    return null;
  const open =
    creator.country === null ||
    countries === null ||
    (Array.isArray(countries) && countries.length === 0);
  return {
    platforms,
    languages,
    niches,
    country: open ? "any" : creator.country!,
  };
}

/**
 * Country and languages for creator matching come from the shared "about
 * me" profile (D507, 29.8); the creator row is the fallback until stage
 * 6.4d drops it. No shared country keeps the creator's own, null = any.
 */
export function withSharedPlace<
  T extends { languages: string[]; country: string | null },
>(
  profile: T,
  shared: {
    country: string | null;
    languages: readonly { code: string }[];
  } | null,
): T {
  if (!shared) return profile;
  const languages = shared.languages.map((item) => item.code);
  return {
    ...profile,
    languages: languages.length ? languages : profile.languages,
    country: shared.country ?? profile.country,
  };
}

export function bountyAllowed(minor: bigint): boolean {
  return minor >= BigInt(L.bountyMinMinor) && minor <= BigInt(L.bountyMaxMinor);
}

export function assertBounty(minor: bigint): void {
  if (!bountyAllowed(minor)) {
    throw new HttpError(
      422,
      UGC_ERRORS.bountyOutOfRange,
      "Bounty must be between $5 and $500",
    );
  }
}

/** True when the text still contains an email, phone or link (27.13). */
export function hasContacts(text: string): boolean {
  return redactPii(text) !== text;
}

export function assertNoContacts(text: string, field: string): void {
  if (hasContacts(text)) {
    throw validationError([{ path: field, problem: "contacts" }]);
  }
}

const HOSTS = new Set<string>(UGC_SUBMISSION_HOSTS);

/**
 * Host of an https review link, or null. Does not fetch the URL (27.10).
 */
export function submissionHost(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  return HOSTS.has(host) ? host : null;
}

export function assertSubmissionUrl(url: string): void {
  if (!submissionHost(url)) {
    throw new HttpError(
      422,
      UGC_ERRORS.badSubmissionUrl,
      "The review link must be an https link on TikTok, Instagram or YouTube",
    );
  }
}

/** A count the creator stated. The host is not fetched (phase B). */
export function assertReportedViews(views: number): void {
  if (!Number.isInteger(views) || views < 0 || views > L.reportedViewsMax) {
    throw validationError([{ path: "views", problem: "range" }]);
  }
}

export function profileReady(input: {
  displayName: string;
  languages: readonly string[];
  platforms: readonly UgcPlatform[];
  niches: readonly UgcNiche[];
}): boolean {
  return (
    input.displayName.trim().length > 0 &&
    input.languages.length > 0 &&
    input.platforms.length > 0 &&
    input.niches.length > 0
  );
}

/** Open campaigns still take applications until the deadline day has passed. */
export function acceptsNewWork(input: {
  status: "open" | string;
  deadline: string;
  today: string;
}): boolean {
  return input.status === "open" && input.deadline >= input.today;
}

export function assertAcceptsNewWork(input: {
  status: string;
  deadline: string;
  today: string;
}): void {
  if (!acceptsNewWork(input)) {
    throw new HttpError(
      409,
      UGC_ERRORS.campaignClosedToWork,
      "This campaign is not taking new work",
    );
  }
}

/** Hired people cannot exceed the number of videos (27.4). */
export function assertHireRoom(hired: number, videosWanted: number): void {
  if (hired >= videosWanted) {
    throw new HttpError(409, UGC_ERRORS.hireCap, "Every video slot is filled");
  }
}

/**
 * A creator gets at most 3 offers a day. Open offers plus hires stay within
 * videos × 3 (27.7).
 */
export function assertOfferRoom(input: {
  offersToCreatorToday: number;
  openOffers: number;
  hired: number;
  videosWanted: number;
}): void {
  assertHireRoom(input.hired, input.videosWanted);
  if (input.offersToCreatorToday >= L.offersPerCreatorPerDay) {
    throw new HttpError(
      409,
      UGC_ERRORS.offerCap,
      "This creator already has three offers today",
    );
  }
  if (input.openOffers + input.hired >= input.videosWanted * 3) {
    throw new HttpError(
      409,
      UGC_ERRORS.offerCap,
      "This campaign has enough open offers",
    );
  }
}

/** A winner for ads needs rights that allow ads (27.4). */
export function assertWinnerRights(rights: UgcRights): void {
  if (rights === "organic") {
    throw new HttpError(
      409,
      UGC_ERRORS.organicWinner,
      "Organic rights cannot be marked as an ad winner",
    );
  }
}

/** The second change request is refused (27.4). */
export function assertRevisionAvailable(used: boolean): void {
  if (used) {
    throw new HttpError(
      409,
      UGC_ERRORS.revisionUsed,
      "This submission already had its one change request",
    );
  }
}

export function assertHired(status: string): void {
  if (status !== "hired") {
    throw new HttpError(
      409,
      UGC_ERRORS.notHired,
      "Only a hired creator can submit a video",
    );
  }
}

/** Applying does not hire. The row starts as an application (D444). */
export function participationFromApply(): "applied" {
  return "applied";
}

/** A join link is an application, not a hire (27.9). */
export function participationFromJoin(): "applied" {
  return "applied";
}

export function hashJoinToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function offerExpiresAt(offeredAt: Date): Date {
  return new Date(offeredAt.getTime() + L.offerSilenceDays * DAY_MS);
}

export function joinExpiresAt(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + L.joinTokenDays * DAY_MS);
}
