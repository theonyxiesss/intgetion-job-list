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
  campaignBudget,
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
  listMyCampaignSummaries,
  ugcPriceGuide,
  listMyInvites,
  listOpenCampaigns,
  matchOpenCampaigns,
  getOwnCreatorProfile,
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
export {
  confirmBriefDraft,
  isExplicitBriefConfirmation,
  isExplicitDraftReset,
  unconfirmedBriefRanges,
  missingBriefFields,
  mergeBriefPatch,
  normalizedLanguages,
  patchBriefDraft,
  readBriefDraft,
  resetBriefDraft,
  type BriefDraft,
  type BriefDraftRow,
} from "./drafts";
export {
  priceGuide,
  rewardInLimits,
  ugcBudgetMinor,
  UGC_PRICE_DEFAULT,
  UGC_PRICE_PRESETS,
  UGC_RANGE_MIN_COUNT,
  UGC_RIGHTS_HINT,
  usdLabel,
} from "./pricing";
export type { UgcPriceGuide } from "./pricing";
export {
  campaignProgress,
  countParticipants,
  stepIndex,
  UGC_STEPS,
} from "./progress";
export type { UgcCounts, UgcProgress, UgcStep } from "./progress";
export { startPayloadRoute, ugcTokenFromStart } from "./start-payload";
export { handleUgcTelegramStart } from "./telegram-start";
export {
  campaignDepositState,
  confirmCampaignDeposit,
  createCampaignDeposit,
  listRefundsDue,
  listWalletPayouts,
  payRewardByTx,
  recheckCampaignDeposits,
  refreshCampaignDeposit,
  refundByTx,
  setUgcChainReaderForTests,
} from "./escrow";
export type {
  DepositState,
  DepositView,
  RefundDueRow,
  WalletPayoutRow,
} from "./escrow";
export { escrowOn } from "./escrow-gate";
export {
  assertBudgetRoom,
  committedMinor,
  escrowRequired,
  refundableMinor,
  refundBlocked,
} from "./escrow-rules";
export { companyNextStep, creatorNextStep, ugcNextStep } from "./next-step";
export type { UgcNextStep } from "./next-step";
