import type {
  Campaign,
  CampaignVersion,
  CreatorProfile,
  Invite,
  JoinToken,
  Payout,
  RoomMessage,
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
  /** The brief texts a company may change while it is open or paused (D512). */
  saveCampaignText(row: Campaign): Promise<void>;
  /** A brief taken back from review before anyone saw it (D512). */
  deleteCampaign(id: string): Promise<void>;
  getCampaign(id: string): Promise<Campaign | null>;
  listByCompanies(companyIds: readonly string[]): Promise<Campaign[]>;
  listOpen(): Promise<Campaign[]>;
  /** Briefs an admin let through (open, paused or closed), for the price guide (D464). */
  listReviewed(): Promise<Campaign[]>;
  countCreatedSince(companyId: string, since: Date): Promise<number>;
  getInvite(id: string): Promise<Invite | null>;
  findInvite(campaignId: string, userId: string): Promise<Invite | null>;
  listInvites(campaignId: string): Promise<Invite[]>;
  listInvitesForCreator(userId: string): Promise<Invite[]>;
  /** Invites of many briefs in one read (U2, TZ 48): no read per brief. */
  listInvitesForCampaigns(campaignIds: readonly string[]): Promise<Invite[]>;
  /** Creator profiles in one read; ids without a profile are absent. */
  getProfiles(userIds: readonly string[]): Promise<Map<string, CreatorProfile>>;
  /** Payouts of many submissions in one read, keyed by submission id. */
  listPayoutsBySubmissions(
    submissionIds: readonly string[],
  ): Promise<Map<string, Payout>>;
  /** Confirmed budgets of many briefs in one read, keyed by brief id. */
  confirmedDepositsMinor(
    campaignIds: readonly string[],
  ): Promise<Map<string, bigint>>;
  insertInvite(row: Invite): Promise<void>;
  saveInvite(row: Invite): Promise<void>;
  offersToCreatorOnDay(userId: string, day: string): Promise<number>;
  getSubmission(inviteId: string): Promise<Submission | null>;
  listSubmissions(inviteIds: readonly string[]): Promise<Submission[]>;
  insertSubmission(row: Submission): Promise<void>;
  saveSubmission(row: Submission): Promise<void>;
  /** Videos the company has not decided yet (U4б). */
  listSubmissionsAwaitingReview(): Promise<Submission[]>;
  getPayout(id: string): Promise<Payout | null>;
  getPayoutBySubmission(submissionId: string): Promise<Payout | null>;
  listOwedPayouts(): Promise<Payout[]>;
  /** The confirmed budget paid into the campaign wallet, or null (D466). */
  confirmedDepositMinor(campaignId: string): Promise<bigint | null>;
  insertPayout(row: Payout): Promise<void>;
  savePayout(row: Payout): Promise<void>;
  /** Saved states of a brief's texts, oldest first (U3б). */
  listCampaignVersions(campaignId: string): Promise<CampaignVersion[]>;
  insertCampaignVersions(rows: readonly CampaignVersion[]): Promise<void>;
  /** Messages of one participation's room, oldest first (U4). */
  listRoomMessages(inviteId: string): Promise<RoomMessage[]>;
  insertRoomMessage(row: RoomMessage): Promise<void>;
  revokeJoinTokens(campaignId: string, at: Date): Promise<void>;
  insertJoinToken(row: JoinToken): Promise<void>;
  findJoinToken(tokenHash: string): Promise<JoinToken | null>;
  listPendingReview(): Promise<Campaign[]>;
  notify(notice: UgcNotice): Promise<void>;
  audit(
    actorId: string,
    action: string,
    entityId: string,
    entityType?: string,
  ): Promise<void>;
}
