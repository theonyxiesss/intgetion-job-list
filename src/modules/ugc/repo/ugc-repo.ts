import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  creatorProfiles,
  ugcCampaigns,
  ugcInvites,
  ugcJoinTokens,
  ugcPayouts,
  ugcSubmissions,
  users,
  userProfiles,
} from "@/db/schema";
import { recordAudit } from "@/lib/audit";
import { writeSharedFacts } from "@/modules/users/service";
import {
  findMemberRole,
  getCompaniesForUser,
  listMemberUserIds,
} from "@/modules/companies/service";
import {
  isNotificationType,
  safeNotify,
} from "@/modules/notifications/service";
import type {
  Campaign,
  CreatorProfile,
  Invite,
  JoinToken,
  Payout,
  Submission,
} from "../service/records";
import type { UgcStore } from "../service/store";

type CampaignRow = typeof ugcCampaigns.$inferSelect;
type ProfileRow = typeof creatorProfiles.$inferSelect;
type InviteRow = typeof ugcInvites.$inferSelect;
type SubmissionRow = typeof ugcSubmissions.$inferSelect;
type PayoutRow = typeof ugcPayouts.$inferSelect;

function campaignOf(row: CampaignRow): Campaign {
  return {
    id: row.id,
    companyId: row.companyId,
    createdBy: row.createdBy,
    status: row.status,
    productName: row.productName,
    productSummary: row.productSummary,
    goal: row.goal,
    niches: row.niches,
    audience: row.audience,
    country: row.country,
    countries: row.countries ?? [],
    languages: row.languages,
    platforms: row.platforms,
    mustSay: row.mustSay,
    mustNot: row.mustNot,
    videosWanted: row.videosWanted,
    bountyMinor: row.bountyMinor,
    deadline: row.deadline,
    rights: row.rights,
    pitch: row.pitch,
    exampleUrls: row.exampleUrls,
    questions: row.questions,
    createdAt: row.createdAt,
  };
}

type SharedPlace = {
  country: string | null;
  languages: { code: string; level: string | null }[] | null;
} | null;

/** Country and languages live in the shared profile (D509); null = any. */
function profileOf(
  row: ProfileRow,
  shared: SharedPlace = null,
): CreatorProfile {
  return {
    userId: row.userId,
    displayName: row.displayName,
    languages: (shared?.languages ?? []).map((item) => item.code),
    platforms: row.platforms,
    niches: row.niches,
    country: shared?.country ?? null,
    exampleUrls: row.exampleUrls,
    inviteOptIn: row.inviteOptIn,
    status: row.status,
  };
}

function inviteOf(row: InviteRow): Invite {
  return {
    id: row.id,
    campaignId: row.campaignId,
    creatorUserId: row.creatorUserId,
    status: row.status,
    bountyMinor: row.bountyMinor,
    rights: row.rights,
    pitch: row.pitch,
    reminders: row.reminders,
    revisionUsed: row.revisionUsed,
    deadlineNoted: row.deadlineNoted,
    offeredAt: row.offeredAt,
    terms: row.terms,
    termsHash: row.termsHash,
    shortlisted: row.shortlisted,
    answers: row.answers,
    declineReason: row.declineReason,
    agreedHash: row.agreedHash,
    agreedAt: row.agreedAt,
    createdAt: row.createdAt,
  };
}

function submissionOf(row: SubmissionRow): Submission {
  return {
    id: row.id,
    inviteId: row.inviteId,
    url: row.url,
    hook: row.hook,
    status: row.status,
    changeNote: row.changeNote,
    liveUrl: row.liveUrl,
    reportedViews: row.reportedViews,
    reportedAt: row.reportedAt,
  };
}

function payoutOf(row: PayoutRow): Payout {
  return {
    id: row.id,
    submissionId: row.submissionId,
    inviteId: row.inviteId,
    amountMinor: row.amountMinor,
    status: row.status,
    paidAt: row.paidAt,
    paidBy: row.paidBy,
  };
}

function dayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Database store. The browser never reads these tables. */
export function productionUgcStore(): UgcStore {
  const db = getDb();
  return {
    now: () => new Date(),
    async isBlocked(userId) {
      const [row] = await db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return !row || row.status !== "active";
    },
    async memberRole(companyId, userId) {
      return findMemberRole(companyId, userId);
    },
    async memberIds(companyId) {
      return listMemberUserIds(companyId);
    },
    async companiesFor(userId) {
      const rows = await getCompaniesForUser(userId);
      return rows.map((row) => ({ id: row.id, name: row.name }));
    },
    async getProfile(userId) {
      const [row] = await db
        .select({
          profile: creatorProfiles,
          country: userProfiles.country,
          languages: userProfiles.languages,
        })
        .from(creatorProfiles)
        .leftJoin(userProfiles, eq(userProfiles.userId, creatorProfiles.userId))
        .where(eq(creatorProfiles.userId, userId))
        .limit(1);
      return row
        ? profileOf(row.profile, {
            country: row.country,
            languages: row.languages,
          })
        : null;
    },
    async saveProfile(profile) {
      const { languages, country, ...own } = profile;
      await db.transaction(async (tx) => {
        await tx
          .insert(creatorProfiles)
          .values(own)
          .onConflictDoUpdate({
            target: creatorProfiles.userId,
            set: { ...own, updatedAt: new Date() },
          });
        // Country and languages are the person's own and live in the shared
        // profile (D509); the name may be a nickname and only fills it.
        await writeSharedFacts(
          profile.userId,
          { displayName: own.displayName },
          "fill",
          tx,
        );
        await writeSharedFacts(
          profile.userId,
          { country, languages: languages.map((code) => ({ code })) },
          "replace",
          tx,
        );
      });
    },
    async listOptInProfiles() {
      const rows = await db
        .select({
          profile: creatorProfiles,
          country: userProfiles.country,
          languages: userProfiles.languages,
        })
        .from(creatorProfiles)
        .leftJoin(userProfiles, eq(userProfiles.userId, creatorProfiles.userId))
        .where(eq(creatorProfiles.inviteOptIn, true));
      return rows.map((row) =>
        profileOf(row.profile, {
          country: row.country,
          languages: row.languages,
        }),
      );
    },
    async insertCampaign(row) {
      await db.insert(ugcCampaigns).values(row);
    },
    async saveCampaign(row) {
      await db
        .update(ugcCampaigns)
        .set({ status: row.status, updatedAt: new Date() })
        .where(eq(ugcCampaigns.id, row.id));
    },
    async saveCampaignText(row) {
      await db
        .update(ugcCampaigns)
        .set({
          productSummary: row.productSummary,
          pitch: row.pitch,
          mustSay: row.mustSay,
          mustNot: row.mustNot,
          exampleUrls: row.exampleUrls,
          questions: row.questions ?? [],
          updatedAt: new Date(),
        })
        .where(eq(ugcCampaigns.id, row.id));
    },
    async deleteCampaign(id) {
      await db.delete(ugcCampaigns).where(eq(ugcCampaigns.id, id));
    },
    async getCampaign(id) {
      const [row] = await db
        .select()
        .from(ugcCampaigns)
        .where(eq(ugcCampaigns.id, id))
        .limit(1);
      return row ? campaignOf(row) : null;
    },
    async listByCompanies(companyIds) {
      if (companyIds.length === 0) return [];
      const rows = await db
        .select()
        .from(ugcCampaigns)
        .where(inArray(ugcCampaigns.companyId, [...companyIds]));
      return rows.map(campaignOf);
    },
    async listOpen() {
      const rows = await db
        .select()
        .from(ugcCampaigns)
        .where(eq(ugcCampaigns.status, "open"));
      return rows.map(campaignOf);
    },
    async listReviewed() {
      const rows = await db
        .select()
        .from(ugcCampaigns)
        .where(inArray(ugcCampaigns.status, ["open", "paused", "closed"]))
        .limit(2000);
      return rows.map(campaignOf);
    },
    async countCreatedSince(companyId, since) {
      const rows = await db
        .select({ id: ugcCampaigns.id })
        .from(ugcCampaigns)
        .where(
          and(
            eq(ugcCampaigns.companyId, companyId),
            gte(ugcCampaigns.createdAt, since),
          ),
        );
      return rows.length;
    },
    async getInvite(id) {
      const [row] = await db
        .select()
        .from(ugcInvites)
        .where(eq(ugcInvites.id, id))
        .limit(1);
      return row ? inviteOf(row) : null;
    },
    async findInvite(campaignId, userId) {
      const [row] = await db
        .select()
        .from(ugcInvites)
        .where(
          and(
            eq(ugcInvites.campaignId, campaignId),
            eq(ugcInvites.creatorUserId, userId),
          ),
        )
        .limit(1);
      return row ? inviteOf(row) : null;
    },
    async listInvites(campaignId) {
      const rows = await db
        .select()
        .from(ugcInvites)
        .where(eq(ugcInvites.campaignId, campaignId));
      return rows.map(inviteOf);
    },
    async listInvitesForCampaigns(campaignIds) {
      if (campaignIds.length === 0) return [];
      const rows = await db
        .select()
        .from(ugcInvites)
        .where(inArray(ugcInvites.campaignId, [...campaignIds]));
      return rows.map(inviteOf);
    },
    async getProfiles(userIds) {
      const out = new Map<string, CreatorProfile>();
      if (userIds.length === 0) return out;
      const rows = await db
        .select({
          profile: creatorProfiles,
          country: userProfiles.country,
          languages: userProfiles.languages,
        })
        .from(creatorProfiles)
        .leftJoin(userProfiles, eq(userProfiles.userId, creatorProfiles.userId))
        .where(inArray(creatorProfiles.userId, [...userIds]));
      for (const row of rows) {
        out.set(
          row.profile.userId,
          profileOf(row.profile, {
            country: row.country,
            languages: row.languages,
          }),
        );
      }
      return out;
    },
    async listPayoutsBySubmissions(submissionIds) {
      const out = new Map<string, Payout>();
      if (submissionIds.length === 0) return out;
      const rows = await db
        .select()
        .from(ugcPayouts)
        .where(inArray(ugcPayouts.submissionId, [...submissionIds]));
      for (const row of rows) out.set(row.submissionId, payoutOf(row));
      return out;
    },
    async confirmedDepositsMinor(campaignIds) {
      const out = new Map<string, bigint>();
      if (campaignIds.length === 0) return out;
      const rows = await db.execute<{
        campaign_id: string;
        amount_minor: string;
      }>(sql`
        select campaign_id, amount_minor::text as amount_minor
        from public.ugc_deposits
        where status = 'confirmed' and campaign_id in (${sql.join(
          campaignIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      `);
      for (const row of rows) {
        if (!out.has(row.campaign_id)) {
          out.set(row.campaign_id, BigInt(row.amount_minor));
        }
      }
      return out;
    },
    async listInvitesForCreator(userId) {
      const rows = await db
        .select()
        .from(ugcInvites)
        .where(eq(ugcInvites.creatorUserId, userId));
      return rows.map(inviteOf);
    },
    async insertInvite(row) {
      await db.insert(ugcInvites).values(row);
    },
    async saveInvite(row) {
      await db
        .update(ugcInvites)
        .set({
          status: row.status,
          bountyMinor: row.bountyMinor,
          rights: row.rights,
          pitch: row.pitch,
          reminders: row.reminders,
          revisionUsed: row.revisionUsed,
          deadlineNoted: row.deadlineNoted,
          offeredAt: row.offeredAt,
          terms: row.terms ?? null,
          termsHash: row.termsHash ?? null,
          shortlisted: row.shortlisted ?? false,
          answers: row.answers ?? [],
          declineReason: row.declineReason ?? null,
          agreedHash: row.agreedHash ?? null,
          agreedAt: row.agreedAt ?? null,
          updatedAt: new Date(),
        })
        .where(eq(ugcInvites.id, row.id));
    },
    async offersToCreatorOnDay(userId, day) {
      const rows = await db
        .select({ offeredAt: ugcInvites.offeredAt })
        .from(ugcInvites)
        .where(eq(ugcInvites.creatorUserId, userId));
      return rows.filter(
        (row) => row.offeredAt !== null && dayOf(row.offeredAt) === day,
      ).length;
    },
    async getSubmission(inviteId) {
      const [row] = await db
        .select()
        .from(ugcSubmissions)
        .where(eq(ugcSubmissions.inviteId, inviteId))
        .limit(1);
      return row ? submissionOf(row) : null;
    },
    async listSubmissions(inviteIds) {
      if (inviteIds.length === 0) return [];
      const rows = await db
        .select()
        .from(ugcSubmissions)
        .where(inArray(ugcSubmissions.inviteId, [...inviteIds]));
      return rows.map(submissionOf);
    },
    async insertSubmission(row) {
      await db.insert(ugcSubmissions).values(row);
    },
    async saveSubmission(row) {
      await db
        .update(ugcSubmissions)
        .set({
          url: row.url,
          hook: row.hook,
          status: row.status,
          changeNote: row.changeNote,
          liveUrl: row.liveUrl,
          reportedViews: row.reportedViews,
          reportedAt: row.reportedAt,
          updatedAt: new Date(),
        })
        .where(eq(ugcSubmissions.id, row.id));
    },
    async getPayout(id) {
      const [row] = await db
        .select()
        .from(ugcPayouts)
        .where(eq(ugcPayouts.id, id))
        .limit(1);
      return row ? payoutOf(row) : null;
    },
    async getPayoutBySubmission(submissionId) {
      const [row] = await db
        .select()
        .from(ugcPayouts)
        .where(eq(ugcPayouts.submissionId, submissionId))
        .limit(1);
      return row ? payoutOf(row) : null;
    },
    async listOwedPayouts() {
      const rows = await db
        .select()
        .from(ugcPayouts)
        .where(eq(ugcPayouts.status, "owed"));
      return rows.map(payoutOf);
    },
    async confirmedDepositMinor(campaignId) {
      const rows = await db.execute<{ amount_minor: string }>(sql`
        select amount_minor::text from public.ugc_deposits
        where campaign_id = ${campaignId} and status = 'confirmed'
        limit 1
      `);
      const row = rows[0];
      return row ? BigInt(row.amount_minor) : null;
    },
    async insertPayout(row) {
      await db.insert(ugcPayouts).values(row);
    },
    async savePayout(row) {
      await db
        .update(ugcPayouts)
        .set({
          status: row.status,
          paidAt: row.paidAt,
          paidBy: row.paidBy,
          updatedAt: new Date(),
        })
        .where(eq(ugcPayouts.id, row.id));
    },
    async revokeJoinTokens(campaignId, at) {
      await db
        .update(ugcJoinTokens)
        .set({ revokedAt: at })
        .where(
          and(
            eq(ugcJoinTokens.campaignId, campaignId),
            isNull(ugcJoinTokens.revokedAt),
          ),
        );
    },
    async insertJoinToken(row: JoinToken) {
      await db.insert(ugcJoinTokens).values(row);
    },
    async findJoinToken(tokenHash) {
      const [row] = await db
        .select()
        .from(ugcJoinTokens)
        .where(eq(ugcJoinTokens.tokenHash, tokenHash))
        .limit(1);
      return row ?? null;
    },
    async listPendingReview() {
      const rows = await db
        .select()
        .from(ugcCampaigns)
        .where(eq(ugcCampaigns.status, "pending_review"));
      return rows.map(campaignOf);
    },
    async notify(notice) {
      if (!isNotificationType(notice.type) || notice.userIds.length === 0) {
        return;
      }
      await safeNotify(
        notice.type,
        notice.userIds,
        notice.payload,
        notice.email ? undefined : { email: false },
      );
    },
    async audit(actorId, action, entityId, entityType = "ugc_campaign") {
      await recordAudit({
        actorId,
        action,
        entityType,
        entityId,
      });
    },
  };
}
