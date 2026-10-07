/**
 * Notification event catalog (spec 15) as data: the 11 event types of
 * section 15 plus saved-search alerts (D234), who
 * receives them, channels with defaults, delivery policy and zod payload
 * schemas. Payloads carry ids and short fields only — no contacts, no email
 * addresses, no phone numbers (D16, D23, D100).
 */
import { z } from "zod";

/** "telegram": a message from the platform bot to a linked account (D236). */
export const NOTIFICATION_CHANNELS = ["inapp", "email", "telegram"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type DeliveryPolicy = "immediate" | "hourly_batch" | "daily_digest";

/** Who receives the notification (15, column «Кому»). */
export type RecipientRole =
  | "candidate"
  | "companyMembers"
  | "companyMembersRecruiterPlus"
  | "jobCreator"
  | "companyOwner"
  | "reporter"
  | "candidateAndCompanyMembers"
  /** The owner of a saved search (D234). */
  | "searchOwner"
  /** A user following the company (D240). */
  | "companyFollower";

export const APPLICATION_STATUSES = [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
] as const;

const idSchema = z.string().min(1);
const strict = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape);

export const NOTIFICATION_PAYLOAD_SCHEMAS = {
  applicationCreated: strict({
    applicationId: idSchema,
    jobId: idSchema,
    jobTitle: z.string().min(1),
    candidateId: idSchema,
  }),
  applicationViewed: strict({
    applicationId: idSchema,
    jobId: idSchema,
    jobTitle: z.string().min(1),
  }),
  applicationStatusChanged: strict({
    applicationId: idSchema,
    jobId: idSchema,
    jobTitle: z.string().min(1),
    status: z.enum(APPLICATION_STATUSES),
  }),
  applicationWithdrawn: strict({
    applicationId: idSchema,
    jobId: idSchema,
    jobTitle: z.string().min(1),
    candidateId: idSchema,
  }),
  mutualInterestRevealed: strict({
    applicationId: idSchema,
    jobId: idSchema,
    jobTitle: z.string().min(1),
  }),
  jobModerationDecided: strict({
    jobId: idSchema,
    jobTitle: z.string().min(1),
    decision: z.enum(["approved", "rejected"]),
  }),
  jobExpiring: strict({
    jobId: idSchema,
    jobTitle: z.string().min(1),
    expiresAt: z.iso.datetime(),
  }),
  jobClosed: strict({
    jobId: idSchema,
    jobTitle: z.string().min(1),
  }),
  companyVerificationDecided: strict({
    companyId: idSchema,
    companyName: z.string().min(1),
    decision: z.enum(["verified", "rejected"]),
  }),
  matchesDigest: strict({
    matchCount: z.number().int().min(0),
    sampleJobIds: z.array(idSchema).max(5),
    sampleJobs: z
      .array(
        strict({
          jobId: idSchema,
          title: z.string().min(1).max(200),
          companyName: z.string().min(1).max(200),
        }),
      )
      .max(5)
      .optional(),
  }),
  searchAlert: strict({
    savedSearchId: idSchema,
    searchName: z.string().min(1).max(80),
    matchCount: z.number().int().min(1),
    sampleJobIds: z.array(idSchema).max(5),
  }),
  companyNewJobs: strict({
    companyId: idSchema,
    companySlug: z.string().min(1).max(120),
    companyName: z.string().min(1).max(200),
    matchCount: z.number().int().min(1),
    sampleJobIds: z.array(idSchema).max(5),
  }),
  reportDecided: strict({
    reportId: idSchema,
    entityType: z.enum(["job", "company", "user"]),
    decision: z.enum(["confirmed", "dismissed"]),
  }),
} as const;

export const NOTIFICATION_TYPES = [
  "application.created",
  "application.viewed",
  "application.status_changed",
  "application.withdrawn",
  "mutual_interest.revealed",
  "job.moderation_decided",
  "job.expiring",
  "job.closed",
  "company.verification_decided",
  "matches.digest",
  "report.decided",
  "search.alert",
  "company.new_jobs",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationPayloads = {
  [K in keyof typeof NOTIFICATION_PAYLOAD_SCHEMAS]: z.infer<
    (typeof NOTIFICATION_PAYLOAD_SCHEMAS)[K]
  >;
};

export interface NotificationEventDefinition {
  type: NotificationType;
  /** Prefix of the i18n keys under the top-level "notifications" key. */
  i18nKey: string;
  recipients: RecipientRole;
  policy: DeliveryPolicy;
  /** Default for the email channel (inapp is always true, 15). */
  emailDefault: boolean;
  payloadSchema: (typeof NOTIFICATION_PAYLOAD_SCHEMAS)[keyof typeof NOTIFICATION_PAYLOAD_SCHEMAS];
}

/** The 11 rows of the section 15 table, in order (D100). */
export const NOTIFICATION_CATALOG: Readonly<
  Record<NotificationType, NotificationEventDefinition>
> = {
  "application.created": {
    type: "application.created",
    i18nKey: "applicationCreated",
    recipients: "companyMembersRecruiterPlus",
    policy: "hourly_batch",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.applicationCreated,
  },
  "application.viewed": {
    type: "application.viewed",
    i18nKey: "applicationViewed",
    recipients: "candidate",
    policy: "immediate",
    emailDefault: false,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.applicationViewed,
  },
  "application.status_changed": {
    type: "application.status_changed",
    i18nKey: "applicationStatusChanged",
    recipients: "candidate",
    policy: "immediate",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.applicationStatusChanged,
  },
  "application.withdrawn": {
    type: "application.withdrawn",
    i18nKey: "applicationWithdrawn",
    recipients: "companyMembers",
    policy: "immediate",
    emailDefault: false,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.applicationWithdrawn,
  },
  "mutual_interest.revealed": {
    type: "mutual_interest.revealed",
    i18nKey: "mutualInterestRevealed",
    recipients: "candidateAndCompanyMembers",
    policy: "immediate",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.mutualInterestRevealed,
  },
  "job.moderation_decided": {
    type: "job.moderation_decided",
    i18nKey: "jobModerationDecided",
    recipients: "jobCreator",
    policy: "immediate",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.jobModerationDecided,
  },
  "job.expiring": {
    type: "job.expiring",
    i18nKey: "jobExpiring",
    recipients: "jobCreator",
    policy: "immediate",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.jobExpiring,
  },
  "job.closed": {
    type: "job.closed",
    i18nKey: "jobClosed",
    recipients: "candidate",
    policy: "immediate",
    emailDefault: false,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.jobClosed,
  },
  "company.verification_decided": {
    type: "company.verification_decided",
    i18nKey: "companyVerificationDecided",
    recipients: "companyOwner",
    policy: "immediate",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.companyVerificationDecided,
  },
  "matches.digest": {
    type: "matches.digest",
    i18nKey: "matchesDigest",
    recipients: "candidate",
    policy: "daily_digest",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.matchesDigest,
  },
  "report.decided": {
    type: "report.decided",
    i18nKey: "reportDecided",
    recipients: "reporter",
    policy: "immediate",
    emailDefault: false,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.reportDecided,
  },
  // Not in section 15: saved-search alerts (D234).
  "search.alert": {
    type: "search.alert",
    i18nKey: "searchAlert",
    recipients: "searchOwner",
    policy: "daily_digest",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.searchAlert,
  },
  // Not in section 15: new jobs of a followed company (D240).
  "company.new_jobs": {
    type: "company.new_jobs",
    i18nKey: "companyNewJobs",
    recipients: "companyFollower",
    policy: "daily_digest",
    emailDefault: true,
    payloadSchema: NOTIFICATION_PAYLOAD_SCHEMAS.companyNewJobs,
  },
};

export function isNotificationType(value: string): value is NotificationType {
  return (NOTIFICATION_TYPES as readonly string[]).includes(value);
}

export function assertNotificationType(value: string): NotificationType {
  if (!isNotificationType(value)) {
    throw new Error(`unknown notification type: ${value}`);
  }
  return value;
}

export function notificationPayloadSchema(
  type: NotificationType,
): NotificationEventDefinition["payloadSchema"] {
  return NOTIFICATION_CATALOG[type].payloadSchema;
}

/**
 * Auth emails (address confirmation, magic link, password reset) are
 * transactional, outside the catalog and cannot be turned off (15, D102).
 * They live in a separate type domain, so they cannot slip into the
 * preference machinery by accident.
 */
export const AUTH_EMAIL_TYPES = [
  "auth.confirmation",
  "auth.magic_link",
  "auth.password_reset",
] as const;

export type AuthEmailType = (typeof AUTH_EMAIL_TYPES)[number];

export function isAuthEmailType(value: string): value is AuthEmailType {
  return (AUTH_EMAIL_TYPES as readonly string[]).includes(value);
}

/** Unsubscribe links appear in every catalog email and never in auth emails. */
export function isUnsubscribable(value: string): value is NotificationType {
  return isNotificationType(value);
}

export interface NotificationPreferenceRow {
  /** notification_preferences.type */
  type: string;
  /** notification_preferences.channel */
  channel: string;
  enabled: boolean;
}

export type ResolveDeliveryResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "disabled_by_preference" | "disabled_by_default";
    };

/**
 * Delivery decision (15, D102): an explicit preference row wins; otherwise
 * the catalog default applies — inapp is enabled for every type, email per
 * the table. Auth emails never reach this function (typed out above).
 */
export function resolveDelivery(
  type: NotificationType,
  channel: NotificationChannel,
  preferences: readonly NotificationPreferenceRow[],
): ResolveDeliveryResult {
  const definition = NOTIFICATION_CATALOG[assertNotificationType(type)];
  if (!(NOTIFICATION_CHANNELS as readonly string[]).includes(channel)) {
    throw new Error(`unknown notification channel: ${channel}`);
  }
  const row = preferences.find(
    (preference) => preference.type === type && preference.channel === channel,
  );
  if (row) {
    return row.enabled
      ? { allowed: true }
      : { allowed: false, reason: "disabled_by_preference" };
  }
  if (channel === "inapp") {
    return { allowed: true };
  }
  // Telegram follows the email default: the same events are worth a push (D236).
  return definition.emailDefault
    ? { allowed: true }
    : { allowed: false, reason: "disabled_by_default" };
}
