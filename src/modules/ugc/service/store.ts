import type {
  Campaign,
  CreatorProfile,
  Invite,
  JoinToken,
  Submission,
  UgcNotice,
} from "./records";

/** Persistence for creative tests. Pages and the bot never talk to it. */
export interface UgcStore {
  now(): Date;
  isBlocked(userId: string): Promise<boolean>;
  memberRole(companyId: string, userId: string): Promise<string | null>;
  memberIds(companyId: string): Promise<string[]>;
  companiesFor(userId: string): Promise<{ id: string; name: string }[]>;
  getProfile(userId: string): Promise<CreatorProfile | null>;
  saveProfile(profile: CreatorProfile): Promise<void>;
  listOptInProfiles(): Promise<CreatorProfile[]>;
  insertCampaign(row: Campaign): Promise<void>;
  saveCampaign(row: Campaign): Promise<void>;
  getCampaign(id: string): Promise<Campaign | null>;
  listByCompanies(companyIds: readonly string[]): Promise<Campaign[]>;
  listOpen(): Promise<Campaign[]>;
  countCreatedSince(companyId: string, since: Date): Promise<number>;
  getInvite(id: string): Promise<Invite | null>;
  findInvite(campaignId: string, userId: string): Promise<Invite | null>;
  listInvites(campaignId: string): Promise<Invite[]>;
  listInvitesForCreator(userId: string): Promise<Invite[]>;
  insertInvite(row: Invite): Promise<void>;
  saveInvite(row: Invite): Promise<void>;
  offersToCreatorOnDay(userId: string, day: string): Promise<number>;
  getSubmission(inviteId: string): Promise<Submission | null>;
  listSubmissions(inviteIds: readonly string[]): Promise<Submission[]>;
  insertSubmission(row: Submission): Promise<void>;
  saveSubmission(row: Submission): Promise<void>;
  revokeJoinTokens(campaignId: string, at: Date): Promise<void>;
  insertJoinToken(row: JoinToken): Promise<void>;
  findJoinToken(tokenHash: string): Promise<JoinToken | null>;
  listPendingReview(): Promise<Campaign[]>;
  notify(notice: UgcNotice): Promise<void>;
  audit(actorId: string, action: string, entityId: string): Promise<void>;
}
