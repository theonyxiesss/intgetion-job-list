/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  auditSignIn,
  callbackUrl,
  changePassword,
  completeCallback,
  getCurrentUser,
  GOOGLE_TERMS_COOKIE,
  googleSignupMetadata,
  isEmailConfirmed,
  logout,
  register,
  requestPasswordReset,
  requireCurrentUser,
  sendMagicLink,
  signIn,
  linkedOAuthAccounts,
  startGoogleSignIn,
  startXSignIn,
  unlinkOAuthProvider,
  linkTelegram,
  linkTelegramProfile,
  signInWithTelegram,
  telegramLinkOf,
  signInWithTelegramProfile,
  unlinkTelegram,
  updateMe,
  userIdForTelegramId,
} from "./auth-service";
export {
  confirmEmailAdd,
  hasPlaceholderEmail,
  requestEmailAdd,
  type ConfirmationMailer,
  type EmailAddResult,
} from "./email-change";
export {
  authEmailKindFromAction,
  renderAuthEmail,
  type AuthEmailKind,
} from "./auth-emails";
export { handleSendEmailHook } from "./send-email-hook";
export { createSessionHandoff } from "./handoff";
export { beginEmailWait, claimEmailWait, readyEmailWait } from "./email-wait";
export { sendTelegramChatAction, sendTelegramMessage } from "./telegram-bot";
export {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
  siteOwnsTelegramWebhook,
  telegramWebhookSecretMatches,
  verifyTelegramInitData,
  type TelegramInitData,
} from "./telegram";
export {
  beginTelegramBotLogin,
  finishTelegramBotLink,
  finishTelegramBotLogin,
  handleTelegramWebhook,
  type TelegramPoll,
} from "./telegram-login";
export type {
  AuthClient,
  CallbackParams,
  CallbackResult,
  CurrentUser,
  LinkedOAuth,
  OAuthProviderName,
  RegisterResult,
} from "./auth-service";
export { toMeDto } from "../api/me-dto";
export type { MeCompany, MeContext, MeDto } from "../api/me-dto";
export {
  PASSWORD_MAX_LENGTH,
  addEmailInput,
  PASSWORD_MIN_LENGTH,
  localeSchema,
  loginInput,
  magicLinkInput,
  newPasswordInput,
  passwordSchema,
  registerInput,
  resetInput,
  updateMeInput,
} from "../schemas";
