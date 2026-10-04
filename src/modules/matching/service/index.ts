/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  ALGO_VERSION,
  SHOW_THRESHOLD,
  LOW_DATA_WEIGHT_SUM,
  COMPONENT_WEIGHTS,
  buildMatch,
  scoreCandidate,
  countMissingMustHaves,
  type MatchResult,
  type ComponentBreakdown,
  type ScoreExclusion,
} from "../score/assemble";
export {
  hardFilter,
  type HardFilterReason,
  type HardFilterResult,
} from "../score/hard-filter";
export {
  skillsComponent,
  roleComponent,
  salaryComponent,
  tzOverlapComponent,
  experienceComponent,
  languagesComponent,
  hasCompleteJobSalary,
} from "../score/components";
export {
  feedbackMultiplier,
  type FeedbackMultiplier,
  type SuggestProfileUpdateField,
} from "../score/feedback";
export {
  explainMatch,
  topExplain,
  sortExplain,
  toPublicMatch,
  type PublicMatch,
} from "../score/explain";
export { NoopSemanticProvider, type SemanticProvider } from "../score/semantic";
export type {
  CandidateForScoring,
  JobForScoring,
  FeedbackForScoring,
  ScoringContext,
  ComponentKey,
  ComponentResult,
  ExplainEntry,
  ExplainVerdict,
  CandidateSkillForScoring,
  CandidateLanguageForScoring,
  JobSkillForScoring,
  JobLanguageForScoring,
} from "../score/types";
export { emptyFeedback, skillLevelIndex, cefrLevelIndex } from "../score/types";
export {
  CACHE_MAX_AGE_MS,
  JOB_CANDIDATE_LIMIT,
  MATCH_STORE_LIMIT,
  PREFILTER_LIMIT,
  envelopeLowData,
  isCacheFresh,
  scoreToNumeric,
  selectShown,
} from "./cache-rules";
export {
  computeMatches,
  computeMatchesForJob,
  getMatches,
  resetComputeCount,
  takeComputeCount,
  type MatchItem,
  type MatchList,
} from "./compute";
export {
  enqueueMatchingForJob,
  invalidateUserMatches,
  runMatchingCron,
} from "./queue";
export {
  QUEUE_BUDGET_MS,
  QUEUE_LOCK_MS,
  QUEUE_MAX_ATTEMPTS,
  failureOutcome,
  retryDelayMs,
  runQueue,
  type ClaimedTask,
  type QueueRunResult,
  type QueueStore,
} from "./queue-rules";
export {
  FEED_DEFAULT_LIMIT,
  FEED_MAX_LIMIT,
  HIDDEN_TAB_LIMIT,
  MATCH_TABS,
  NEW_JOB_MS,
  clampLimit,
  decodeCursor,
  encodeCursor,
  isMatchTab,
  isNewJob,
  pageOf,
  profileHints,
  sortByScore,
  visibleMatches,
  type MatchTab,
  type ProfileHint,
} from "./feed-rules";
export {
  readExcludedSetsForUser,
  readHiddenJobsForUser,
  readHideReasonCountsForUser,
} from "./reads";
