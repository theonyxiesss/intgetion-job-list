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
  isEmailConfirmed,
  logout,
  register,
  requestPasswordReset,
  requireCurrentUser,
  sendMagicLink,
  signIn,
  linkTelegram,
  signInWithTelegram,
  telegramLinkOf,
  signInWithTelegramProfile,
  unlinkTelegram,
  updateMe,
} from "./auth-service";
export {
  confirmEmailAdd,
  hasPlaceholderEmail,
  requestEmailAdd,
  type ConfirmationMailer,
  type EmailAddResult,
} from "./email-change";
export {
  telegramAuthUrl,
  telegramBotId,
  telegramBotToken,
  telegramWebhookSecretMatches,
} from "./telegram";
export {
  beginTelegramBotLogin,
  finishTelegramBotLogin,
  handleTelegramWebhook,
  type TelegramPoll,
} from "./telegram-login";
export type {
  AuthClient,
  CallbackParams,
  CallbackResult,
  CurrentUser,
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
