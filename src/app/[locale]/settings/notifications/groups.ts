/**
 * v2 (UI_V2) settings mockup: notification events as a few groups with one
 * switch per channel. Every catalog type belongs to exactly one group
 * (groups.test.ts). The mockup's «Payouts» and «Platform news» rows have no
 * notification type yet, so they are not shown; «Hiring» and «Checks» are
 * added for employers and moderation decisions that the mockup did not list.
 */
export const NOTIFICATION_GROUPS = [
  {
    id: "matches",
    types: ["matches.digest", "search.alert", "company.new_jobs"],
  },
  {
    id: "replies",
    types: [
      "application.viewed",
      "application.status_changed",
      "mutual_interest.revealed",
    ],
  },
  { id: "messages", types: ["ugc.message"] },
  {
    id: "orders",
    types: [
      "freelance.request_created",
      "freelance.order_updated",
      "freelance.task_proposal",
    ],
  },
  {
    id: "ugc",
    types: [
      "ugc.invite",
      "ugc.application",
      "ugc.submission",
      "ugc.submission_decided",
      "ugc.deadline",
      "ugc.review_due",
      "ugc.review_late",
      "ugc.campaign_decided",
      "ugc.dispute",
    ],
  },
  {
    id: "hiring",
    types: [
      "application.created",
      "application.withdrawn",
      "job.expiring",
      "job.closed",
      "company.candidates_digest",
    ],
  },
  {
    id: "checks",
    types: [
      "job.moderation_decided",
      "freelance.service_decided",
      "company.verification_decided",
      "report.decided",
    ],
  },
] as const;

export type NotificationGroupId = (typeof NOTIFICATION_GROUPS)[number]["id"];
