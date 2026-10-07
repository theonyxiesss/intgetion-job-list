/**
 * Notification types about new jobs that the bot switch covers. A plain module:
 * a server page cannot read values exported from a "use client" file.
 */
export const NEW_JOB_TYPES = [
  "search.alert",
  "matches.digest",
  "company.new_jobs",
] as const;
