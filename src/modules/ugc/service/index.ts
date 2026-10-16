/**
 * Public service surface of creative tests (D448, tz/27-ugc.md).
 * Other modules may import only this file. Pages and the bot are not in
 * this slice. Freelance (D446) is a different module.
 */
export {
  UGC_CAMPAIGN_STATUSES,
  UGC_GOALS,
  UGC_LIMITS,
  UGC_NICHES,
  UGC_PARTICIPATION_STATUSES,
  UGC_PLATFORMS,
  UGC_RIGHTS,
  UGC_SUBMISSION_HOSTS,
  UGC_SUBMISSION_STATUSES,
} from "@/config/ugc";
export {
  acceptsNewWork,
  assertAcceptsNewWork,
  assertBounty,
  assertHireRoom,
  assertHired,
  assertNoContacts,
  assertOfferRoom,
  assertReportedViews,
  assertRevisionAvailable,
  assertSubmissionUrl,
  assertWinnerRights,
  bountyAllowed,
  countryMatches,
  creatorMatches,
  hashJoinToken,
  hasContacts,
  joinExpiresAt,
  offerExpiresAt,
  participationFromApply,
  participationFromJoin,
  profileReady,
  submissionHost,
  UGC_ERRORS,
} from "./rules";
export type { CreatorMatchSide, MatchSide } from "./rules";
export {
  CAMPAIGN_TRANSITIONS,
  checkCampaignTransition,
  checkParticipationTransition,
  checkSubmissionTransition,
  PARTICIPATION_TRANSITIONS,
  SUBMISSION_TRANSITIONS,
} from "./transitions";
export type {
  CampaignActor,
  ParticipationActor,
  SubmissionActor,
} from "./transitions";
export {
  acceptInvite,
  applyToCampaign,
  campaignWriteAllowed,
  closeCampaign,
  createCampaign,
  decideCampaign,
  decideSubmission,
  decisionFromUtterance,
  declineInvite,
  getMyCreatorProfile,
  issueJoinLink,
  markPayoutPaid,
  listMyCampaigns,
  listMyInvites,
  listOpenCampaigns,
  listOwedPayouts,
  listReviewQueue,
  noteDeadlines,
  offerHire,
  listWinners,
  previewMatches,
  readCampaign,
  reportLivePost,
  redeemJoinToken,
  remindInvite,
  requestChanges,
  saveCreatorProfile,
  submitVideo,
  useUgcStore,
} from "./commands";
export { ugcTools } from "./bot-tools";
export { startPayloadRoute, ugcTokenFromStart } from "./start-payload";
export { handleUgcTelegramStart } from "./telegram-start";
