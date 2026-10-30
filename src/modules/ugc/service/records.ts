import type {
  UgcCampaignStatus,
  UgcCreatorStatus,
  UgcGoal,
  UgcNiche,
  UgcParticipationStatus,
  UgcPlatform,
  UgcDeclineReason,
  UgcDisputeOutcome,
  UgcDisputeReason,
  UgcDisputeStatus,
  UgcReportReason,
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
import type { UgcDeliveryProblem } from "./delivery";
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
  /** U4б: when the video went to review; absent before 0079. */
  submittedAt?: Date | null;
  /** The reminder stage the company has had (0-3). */
  reviewStage?: number;
  escalatedAt?: Date | null;
  /** The company said the link does not open (U5, D573). */
  linkReportedAt?: Date | null;
  /** When the company answered: accepted, rejected, winner or changes asked (0085). */
  decidedAt?: Date | null;
};

export type SubmissionVersion = {
  id: string;
  submissionId: string;
  version: number;
  url: string;
  hook: string;
  acceptedAt: Date | null;
  createdAt: Date;
};

export type Payout = {
  id: string;
  submissionId: string;
  inviteId: string;
  amountMinor: bigint;
  status: "owed" | "paid";
  paidAt: Date | null;
  paidBy: string | null;
  /** When the reward was recorded as owed (U7). */
  createdAt?: Date;
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

export type RoomMessage = {
  id: string;
  inviteId: string;
  authorId: string | null;
  body: string;
  hiddenAt: Date | null;
  createdAt: Date;
};

export type RoomReport = {
  id: string;
  messageId: string;
  reporterId: string | null;
  reason: UgcReportReason;
  status: "open" | "hidden" | "dismissed";
  createdAt: Date;
};

export type Shipment = {
  inviteId: string;
  carrier: string;
  tracking: string;
  expectedDate: string | null;
  shippedAt: Date;
  receivedAt: Date | null;
  problem: UgcDeliveryProblem | null;
  problemAt: Date | null;
};

export type Dispute = {
  id: string;
  inviteId: string;
  openedBy: string | null;
  side: "company" | "creator";
  reason: UgcDisputeReason;
  note: string;
  status: UgcDisputeStatus;
  outcome: UgcDisputeOutcome | null;
  resolvedAt: Date | null;
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
