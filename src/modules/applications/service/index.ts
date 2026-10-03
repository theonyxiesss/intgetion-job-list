/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 * 5A's `transitionApplication()` must call `checkTransition` and must not
 * duplicate the table (D2, D79).
 */
export {
  APPLY_MIN_COMPLETENESS,
  APPLY_REQUIRED_PARTS,
  JOB_ORIGINS,
  JOB_STATUSES,
  checkApplyEligibility,
  checkApplyTarget,
  checkReapply,
} from "./eligibility";
export type {
  ApplyEligibilityDetails,
  ApplyTarget,
  JobOrigin,
  JobStatus,
  PriorApplication,
} from "./eligibility";
export {
  APPLICATION_STATUSES,
  EXPRESS_INTEREST_REQUIRED,
  TERMINAL_APPLICATION_STATUSES,
  TRANSITIONS,
  checkTransition,
} from "./transitions";
export type {
  ApplicationStatus,
  TransitionActor,
  TransitionEdge,
  TransitionInput,
  TransitionVia,
} from "./transitions";
