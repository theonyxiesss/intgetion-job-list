/**
 * Version of the terms and privacy policy a user accepts at registration.
 * Bump it when the texts in docs/content/legal-*.md change materially
 * (docs/ADMIN.md section 7).
 */
export const TERMS_VERSION = "2026-10-05";

/**
 * Facts the legal texts quote ({{key}} in docs/content/legal-*.md). Only
 * the founder can supply them; until then a page shows "to be specified"
 * in their place (D241).
 */
export const LEGAL_DETAILS: Record<string, string | null> = {
  version: TERMS_VERSION,
  effectiveDate: TERMS_VERSION,
  /** Legal entity or sole trader, registration number. */
  operator: null,
  address: null,
  /** Minimum age of users: 16 or 18, decided with counsel. */
  minAge: "16",
  /** Days to answer an appeal against a suspension. */
  appealDays: "14",
  /** Governing law, e.g. "Republic of Cyprus". */
  lawCountry: null,
  /** Court that hears disputes. */
  court: null,
  supportEmail: null,
  privacyEmail: null,
  securityEmail: null,
  /** How long the database provider keeps backups. */
  backupPeriod: null,
  /** Whether the AI provider may train on the data, per its terms. */
  aiTraining: null,
};
