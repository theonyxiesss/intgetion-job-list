import type {
  UgcCampaignStatus,
  UgcCreatorStatus,
  UgcGoal,
  UgcNiche,
  UgcParticipationStatus,
  UgcPlatform,
  UgcDeclineReason,
  UgcRights,
  UgcSubmissionStatus,
} from "@/config/ugc";

/** Stored rows. Money is integer cents. A raw join token is never a field. */
export type CreatorProfile = {
  userId: string;
  displayName: string;
  languages: string[];
  platforms: UgcPlatform[];
  niches: UgcNiche[];
  country: string | null;
  exampleUrls: string[];
  inviteOptIn: boolean;
  status: UgcCreatorStatus;
};
import type { TermsSnapshot } from "./terms";
import type { BriefTextSnapshot } from "./versions";

export type Campaign = {
  id: string;
  companyId: string;
  createdBy: string;
  status: UgcCampaignStatus;
  productName: string;
  productSummary: string;
  goal: UgcGoal;
  niches: UgcNiche[];
  audience: string;
  country: string | null;
  countries?: string[];
  languages: string[];
  platforms: UgcPlatform[];
  mustSay: string;
  mustNot: string;
  videosWanted: number;
  bountyMinor: bigint;
  deadline: string;
  rights: UgcRights;
  pitch: string;
  exampleUrls: string[];
  /** Questions asked at application; absent on briefs made before 0076. */
  questions?: string[];
  createdAt: Date;
};

export type Invite = {
  id: string;
  campaignId: string;
  creatorUserId: string;
  status: UgcParticipationStatus;
  bountyMinor: bigint | null;
  rights: UgcRights | null;
  pitch: string;
  reminders: number;
  revisionUsed: boolean;
  deadlineNoted: boolean;
  offeredAt: Date | null;
  /** U3: terms the offer carried; absent on offers made before 0074. */
  terms?: TermsSnapshot | null;
  termsHash?: string | null;
  /** Company-only mark on an application; never shown to the creator. */
  shortlisted?: boolean;
  /** Answers to the brief questions, in the order asked. */
  answers?: string[];
  declineReason?: UgcDeclineReason | null;
  agreedHash?: string | null;
  agreedAt?: Date | null;
  createdAt: Date;
};

export type Submission = {
  id: string;
  inviteId: string;
  url: string;
  hook: string;
  status: UgcSubmissionStatus;
  changeNote: string;
  /** Published post. Separate from the review link. Null until the creator reports it. */
  liveUrl: string | null;
  /** What the creator said they saw. Null until they report it. */
  reportedViews: number | null;
  reportedAt: Date | null;
};

export type Payout = {
  id: string;
  submissionId: string;
  inviteId: string;
  amountMinor: bigint;
  status: "owed" | "paid";
  paidAt: Date | null;
  paidBy: string | null;
};

export type CampaignVersion = {
  id: string;
  campaignId: string;
  version: number;
  changedBy: string | null;
  changedFields: string[];
  snapshot: BriefTextSnapshot;
  createdAt: Date;
};

export type JoinToken = {
  campaignId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type UgcNotice = {
  type: string;
  userIds: string[];
  payload: Record<string, string>;
  email: boolean;
};

export type BriefInput = {
  companyId: string;
  productName: string;
  productSummary: string;
  goal: UgcGoal;
  niches: UgcNiche[];
  audience: string;
  country: string | null;
  countries?: string[];
  languages: string[];
  mustSay: string;
  mustNot: string;
  platforms: UgcPlatform[];
  videosWanted: number;
  bountyMinor: bigint;
  deadline: string;
  rights: UgcRights;
  pitch: string;
  exampleUrls: string[];
};

export type ProfileInput = {
  displayName: string;
  languages: string[];
  platforms: UgcPlatform[];
  niches: UgcNiche[];
  country: string | null;
  exampleUrls: string[];
  inviteOptIn: boolean;
  status: UgcCreatorStatus;
};
