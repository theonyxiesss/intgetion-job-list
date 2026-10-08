/**
 * Notification types about new jobs that the bot switch covers. A plain module:
 * a server page cannot read values exported from a "use client" file.
 */
export const NEW_JOB_TYPES = [
  "search.alert",
  "matches.digest",
  "company.new_jobs",
  // The employer morning brief rides the same switches (D352).
  "company.candidates_digest",
] as const;

export type NewJobChannel = "telegram" | "email";

/** One switch writes the same channel for every new-job type (D329, D349). */
export function newJobChannelPreferences(
  channel: NewJobChannel,
  enabled: boolean,
) {
  return NEW_JOB_TYPES.map((type) => ({ type, channel, enabled }));
}
