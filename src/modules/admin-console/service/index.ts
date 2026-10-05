/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  assertActionAllowed,
  assertAdminLoginOpen,
  authorizeAdmin,
  countryOf,
  ensureMfaEnrolled,
  hashAdminToken,
  issueAdminSession,
  makeRecoveryCodes,
  memberSectionsOpen,
  confirmStepUp,
  consoleMember,
  listMySessions,
  needsRecoveryCodes,
  noteAdminLoginFailure,
  readLiveSession,
  requestAuditContext,
  revokeAdminSession,
  revokeSessionById,
  storeRecoveryCodes,
  takeRecoveryCode,
  writeAdminAudit,
  type AdminAccess,
  type IssueResult,
  type LiveAdminSession,
} from "./console-service";
