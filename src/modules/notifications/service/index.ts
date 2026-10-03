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
