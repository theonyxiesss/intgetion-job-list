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
  updateMe,
} from "./auth-service";
export type {
  AuthClient,
  CallbackParams,
  CallbackResult,
  CurrentUser,
} from "./auth-service";
export { toMeDto } from "../api/me-dto";
export type { MeDto } from "../api/me-dto";
export {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  loginInput,
  magicLinkInput,
  newPasswordInput,
  passwordSchema,
  registerInput,
  resetInput,
  updateMeInput,
} from "../schemas";
