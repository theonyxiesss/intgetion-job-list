/**
 * Creative tests (D442–D445, D448, docs/tz/27-ugc.md).
 * One brief, creators apply, the company hires named people.
 * Not a job, not a /services brief, not a freelance service (D446).
 */

export const UGC_NICHES = [
  "app",
  "game",
  "finance",
  "ecommerce",
  "education",
  "other",
] as const;
export type UgcNiche = (typeof UGC_NICHES)[number];

export const UGC_PLATFORMS = ["tiktok", "reels", "shorts"] as const;
export type UgcPlatform = (typeof UGC_PLATFORMS)[number];

export const UGC_GOALS = [
  "awareness",
  "installs",
  "purchases",
  "waitlist",
] as const;
export type UgcGoal = (typeof UGC_GOALS)[number];

export const UGC_RIGHTS = ["organic", "ads", "whitelist"] as const;
export type UgcRights = (typeof UGC_RIGHTS)[number];

export const UGC_CAMPAIGN_STATUSES = [
  "draft",
  "pending_review",
  "open",
  "closed",
  "rejected",
] as const;
export type UgcCampaignStatus = (typeof UGC_CAMPAIGN_STATUSES)[number];

export const UGC_PARTICIPATION_STATUSES = [
  "applied",
  "offered",
  "hired",
  "declined",
  "expired",
  "withdrawn",
] as const;
export type UgcParticipationStatus =
  (typeof UGC_PARTICIPATION_STATUSES)[number];

export const UGC_SUBMISSION_STATUSES = [
  "submitted",
  "changes_requested",
  "accepted",
  "rejected",
  "winner",
] as const;
export type UgcSubmissionStatus = (typeof UGC_SUBMISSION_STATUSES)[number];

export const UGC_CREATOR_STATUSES = ["active", "paused"] as const;
export type UgcCreatorStatus = (typeof UGC_CREATOR_STATUSES)[number];

/** Hosts a review link may use. The page body is never fetched (27.10). */
export const UGC_SUBMISSION_HOSTS = [
  "tiktok.com",
  "www.tiktok.com",
  "instagram.com",
  "www.instagram.com",
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
] as const;

export const UGC_LIMITS = {
  videosMin: 1,
  videosMax: 30,
  bountyMinMinor: 500,
  bountyMaxMinor: 50_000,
  pitchMax: 300,
  changeNoteMax: 500,
  exampleLinksMax: 5,
  offerSilenceDays: 7,
  joinTokenDays: 14,
  offersPerCreatorPerDay: 3,
  draftsPerCompanyPerHour: 5,
  /** Creator-reported views. Not measured by us (phase B). */
  reportedViewsMax: 2_000_000_000,
} as const;
