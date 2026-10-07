/**
 * Public service surface.
 * Other modules may import only this file, never this module's repo.
 */
export {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATALOG,
  NOTIFICATION_PAYLOAD_SCHEMAS,
  AUTH_EMAIL_TYPES,
  APPLICATION_STATUSES,
  isNotificationType,
  isAuthEmailType,
  isUnsubscribable,
  assertNotificationType,
  notificationPayloadSchema,
  resolveDelivery,
  type NotificationType,
  type NotificationChannel,
  type NotificationPayloads,
  type DeliveryPolicy,
  type RecipientRole,
  type NotificationEventDefinition,
  type AuthEmailType,
  type NotificationPreferenceRow,
  type ResolveDeliveryResult,
} from "../lib/catalog";
export {
  groupHourlyBatch,
  type ApplicationCreatedEvent,
  type BatchedApplicationCreated,
} from "../lib/batch";
export {
  DIGEST_HOUR_LOCAL,
  DIGEST_MIN_INTERVAL_MS,
  DIGEST_MIN_SCORE,
  nextDigestAt,
  shouldSendDigest,
  type DigestDecision,
  type DigestDecisionInput,
} from "../lib/digest";
export {
  signUnsubscribe,
  verifyUnsubscribe,
  type UnsubscribeClaims,
  type UnsubscribeVerification,
} from "../lib/unsubscribe";
export { failNextNotify, notify, safeNotify, unsubscribeUrl } from "./notify";
export {
  catalogTitleKey,
  countUnread,
  listNotifications,
  markNotificationsRead,
  readPreferences,
  unsubscribeByToken,
  writePreferences,
} from "./inbox";
export {
  dispatchEmails,
  hasJobExpiringNotice,
  runNotificationCron,
} from "./dispatch";
export { mergeApplicationBatch, utcHourStart } from "./batch-mail";
export { noopEmailSender, senderFromEnv } from "./email-sender";
export type { EmailSender } from "./email-sender";
export { emailCopy, renderEmail } from "./render";
export {
  DIGEST_MAX_JOBS,
  pickDigestJobs,
  type DigestCandidateJob,
  type DigestJobLoader,
} from "./digest";
export {
  runMorningBriefsCron,
  runSlot,
  type BriefRunResult,
} from "./morning-briefs";
export {
  BRIEF_SLOT_IDS,
  dueSlotDate,
  nextSlotStart,
  slotForTimeZone,
  type BriefSlot,
  type BriefSlotId,
} from "../lib/briefs";
export { deliverInTransaction } from "./deliver";
export { toEmailJob, type EmailJobPayload } from "../lib/email-jobs";
export { runTelegramDispatch } from "./telegram-dispatch";
export { telegramText } from "./render";
