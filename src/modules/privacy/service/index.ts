/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  AUTH_DELETE_RETRY_DAYS,
  EXPORT_VERSION,
  deleteMyAccount,
  exportMyData,
  runRetention,
} from "./privacy-service";
export { recordConsent, storedConsent } from "./consent-service";
export { consentInput, deleteAccountInput } from "../schemas";
