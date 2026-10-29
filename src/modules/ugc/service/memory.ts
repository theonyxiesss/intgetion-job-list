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
import type { UgcStore } from "./store";

function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** In-memory store for the phase A rules. Production uses the database. */
export class MemoryUgcStore implements UgcStore {
  now = () => this.clock;
  clock = new Date("2026-10-16T12:00:00.000Z");
  blocked = new Set<string>();
  members: { companyId: string; userId: string }[] = [];
  companies: { id: string; name: string; userId: string }[] = [];
  profiles = new Map<string, CreatorProfile>();
  campaigns = new Map<string, Campaign>();
  invites = new Map<string, Invite>();
  submissions = new Map<string, Submission>();
  payouts = new Map<string, Payout>();
  /** Confirmed budget per campaign id, in cents (D466). */
  deposits = new Map<string, bigint>();
  tokens: JoinToken[] = [];
  notices: UgcNotice[] = [];
  audits: {
    actorId: string;
    action: string;
    entityId: string;
    entityType: string;
  }[] = [];

  async isBlocked(userId: string) {
    return this.blocked.has(userId);
  }
  async memberRole(companyId: string, userId: string) {
    return this.members.some(
      (row) => row.companyId === companyId && row.userId === userId,
    )
      ? "member"
      : null;
  }
  async memberIds(companyId: string) {
    return this.members
      .filter((row) => row.companyId === companyId)
      .map((row) => row.userId);
  }
  async companiesFor(userId: string) {
    return this.companies
      .filter((row) => row.userId === userId)
      .map(({ id, name }) => ({ id, name }));
  }
  async getProfile(userId: string) {
    return this.profiles.get(userId) ?? null;
  }
  async saveProfile(profile: CreatorProfile) {
    this.profiles.set(profile.userId, profile);
  }
  async listOptInProfiles() {
    return [...this.profiles.values()].filter((row) => row.inviteOptIn);
  }
  async insertCampaign(row: Campaign) {
    this.campaigns.set(row.id, row);
  }
  async saveCampaign(row: Campaign) {
    this.campaigns.set(row.id, row);
  }
  async saveCampaignText(row: Campaign) {
    this.campaigns.set(row.id, row);
  }
  async deleteCampaign(id: string) {
    this.campaigns.delete(id);
  }
  async getCampaign(id: string) {
    return this.campaigns.get(id) ?? null;
  }
  async listByCompanies(companyIds: readonly string[]) {
    const ids = new Set(companyIds);
    return [...this.campaigns.values()].filter((row) => ids.has(row.companyId));
  }
  async listOpen() {
    return [...this.campaigns.values()].filter((row) => row.status === "open");
  }
  async listReviewed() {
    return [...this.campaigns.values()].filter(
      (row) =>
        row.status === "open" ||
        row.status === "paused" ||
        row.status === "closed",
    );
  }
  async countCreatedSince(companyId: string, since: Date) {
    return [...this.campaigns.values()].filter(
      (row) => row.companyId === companyId && row.createdAt >= since,
    ).length;
  }
  async getInvite(id: string) {
    return this.invites.get(id) ?? null;
  }
  async findInvite(campaignId: string, userId: string) {
    return (
      [...this.invites.values()].find(
        (row) => row.campaignId === campaignId && row.creatorUserId === userId,
      ) ?? null
    );
  }
  async listInvites(campaignId: string) {
    return [...this.invites.values()].filter(
      (row) => row.campaignId === campaignId,
    );
  }
  async listInvitesForCampaigns(campaignIds: readonly string[]) {
    const wanted = new Set(campaignIds);
    return [...this.invites.values()].filter((row) =>
      wanted.has(row.campaignId),
    );
  }
  async getProfiles(userIds: readonly string[]) {
    const out = new Map<string, CreatorProfile>();
    for (const id of userIds) {
      const profile = this.profiles.get(id);
      if (profile) out.set(id, profile);
    }
    return out;
  }
  async listPayoutsBySubmissions(submissionIds: readonly string[]) {
    const wanted = new Set(submissionIds);
    const out = new Map<string, Payout>();
    for (const row of this.payouts.values()) {
      if (wanted.has(row.submissionId)) out.set(row.submissionId, row);
    }
    return out;
  }
  async confirmedDepositsMinor(campaignIds: readonly string[]) {
    const out = new Map<string, bigint>();
    for (const id of campaignIds) {
      const amount = this.deposits.get(id);
      if (amount !== undefined) out.set(id, amount);
    }
    return out;
  }
  async listInvitesForCreator(userId: string) {
    return [...this.invites.values()].filter(
      (row) => row.creatorUserId === userId,
    );
  }
  async insertInvite(row: Invite) {
    this.invites.set(row.id, row);
  }
  async saveInvite(row: Invite) {
    this.invites.set(row.id, row);
  }
  async offersToCreatorOnDay(userId: string, day: string) {
    return [...this.invites.values()].filter(
      (row) =>
        row.creatorUserId === userId &&
        row.offeredAt !== null &&
        dayOf(row.offeredAt) === day,
    ).length;
  }
  async getSubmission(inviteId: string) {
    return (
      [...this.submissions.values()].find((row) => row.inviteId === inviteId) ??
      null
    );
  }
  async listSubmissions(inviteIds: readonly string[]) {
    const ids = new Set(inviteIds);
    return [...this.submissions.values()].filter((row) =>
      ids.has(row.inviteId),
    );
  }
  async insertSubmission(row: Submission) {
    this.submissions.set(row.id, row);
  }
  async saveSubmission(row: Submission) {
    this.submissions.set(row.id, row);
  }
  async getPayout(id: string) {
    return this.payouts.get(id) ?? null;
  }
  async getPayoutBySubmission(submissionId: string) {
    return (
      [...this.payouts.values()].find(
        (row) => row.submissionId === submissionId,
      ) ?? null
    );
  }
  async listOwedPayouts() {
    return [...this.payouts.values()].filter((row) => row.status === "owed");
  }
  async confirmedDepositMinor(campaignId: string) {
    return this.deposits.get(campaignId) ?? null;
  }
  async insertPayout(row: Payout) {
    this.payouts.set(row.id, row);
  }
  async savePayout(row: Payout) {
    this.payouts.set(row.id, row);
  }
  async revokeJoinTokens(campaignId: string, at: Date) {
    for (const token of this.tokens) {
      if (token.campaignId === campaignId && token.revokedAt === null) {
        token.revokedAt = at;
      }
    }
  }
  async listSubmissionsAwaitingReview() {
    return [...this.submissions.values()].filter(
      (row) => row.status === "submitted",
    );
  }
  roomMessages: RoomMessage[] = [];
  async listRoomMessages(inviteId: string) {
    return this.roomMessages
      .filter((row) => row.inviteId === inviteId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async insertRoomMessage(row: RoomMessage) {
    this.roomMessages.push(row);
  }
  versions: CampaignVersion[] = [];
  async listCampaignVersions(campaignId: string) {
    return this.versions
      .filter((row) => row.campaignId === campaignId)
      .sort((a, b) => a.version - b.version);
  }
  async insertCampaignVersions(rows: readonly CampaignVersion[]) {
    this.versions.push(...rows);
  }
  async insertJoinToken(row: JoinToken) {
    this.tokens.push(row);
  }
  async findJoinToken(tokenHash: string) {
    return this.tokens.find((row) => row.tokenHash === tokenHash) ?? null;
  }
  async listPendingReview() {
    return [...this.campaigns.values()].filter(
      (row) => row.status === "pending_review",
    );
  }
  async notify(notice: UgcNotice) {
    this.notices.push(notice);
  }
  async audit(
    actorId: string,
    action: string,
    entityId: string,
    entityType = "ugc_campaign",
  ) {
    this.audits.push({ actorId, action, entityId, entityType });
  }
}
