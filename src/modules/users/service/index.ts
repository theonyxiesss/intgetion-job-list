/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  EMPTY_PROFILE,
  exportSharedProfile,
  mergeSharedFacts,
  noteSharedProfile,
  readSharedProfile,
  updateSharedProfile,
  writeSharedFacts,
  applySharedPatch,
  patchSharedProfile,
} from "./shared-profile";
export {
  WALLET_ERRORS,
  WALLET_STATEMENT,
  disconnectAccountWallet,
  issueAccountWalletNonce,
  readAccountWallet,
  verifyAccountWalletSignature,
  walletChangeImpact,
  type AccountWallet,
  type WalletImpact,
} from "./wallet";
export {
  SHARED_LANGUAGE_LEVELS,
  sharedProfileInput,
  type SharedProfileInput,
} from "../schemas";
export type {
  NoteMode,
  SharedFacts,
  SharedLanguage,
  SharedProfile,
  SharedPatch,
} from "./shared-profile";
