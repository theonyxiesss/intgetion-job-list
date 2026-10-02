import { pgEnum } from "drizzle-orm/pg-core";

export const userStatus = pgEnum("user_status", [
  "active",
  "suspended",
  "deleted",
]);

export const platformRole = pgEnum("platform_role", ["user", "admin"]);

export const workFormat = pgEnum("work_format", ["remote", "hybrid", "onsite"]);

export const employmentType = pgEnum("employment_type", [
  "full_time",
  "part_time",
  "contract",
]);

export const salaryPeriod = pgEnum("salary_period", ["hour", "month", "year"]);

export const salaryBasis = pgEnum("salary_basis", ["gross", "net"]);

export const skillLevel = pgEnum("skill_level", [
  "novice",
  "intermediate",
  "advanced",
  "expert",
]);

export const cefrLevel = pgEnum("cefr_level", [
  "A1",
  "A2",
  "B1",
  "B2",
  "C1",
  "C2",
  "native",
]);

export const companyStatus = pgEnum("company_status", [
  "unverified",
  "pending_verification",
  "verified",
  "rejected",
  "suspended",
]);

export const companyOrigin = pgEnum("company_origin", ["internal", "imported"]);

export const companySize = pgEnum("company_size", [
  "s1_10",
  "s11_50",
  "s51_200",
  "s201_1000",
  "s1000_plus",
]);

export const memberRole = pgEnum("member_role", [
  "owner",
  "admin",
  "recruiter",
  "member",
]);

export const jobStatus = pgEnum("job_status", [
  "draft",
  "pending_moderation",
  "published",
  "paused",
  "expired",
  "closed",
  "removed",
]);

export const jobSource = pgEnum("job_source", ["internal", "imported"]);

export const applicationMethod = pgEnum("application_method", [
  "internal",
  "external_url",
  "email",
]);

export const applicationStatus = pgEnum("application_status", [
  "applied",
  "viewed",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
  "withdrawn",
]);

export const feedbackAction = pgEnum("feedback_action", [
  "viewed",
  "saved",
  "unsaved",
  "applied",
  "applied_external",
  "dismissed",
  "hidden",
  "hidden_company",
]);

export const reportReason = pgEnum("report_reason", [
  "scam",
  "spam",
  "fake_company",
  "discrimination",
  "wrong_info",
  "inappropriate",
  "other",
]);

export const reportStatus = pgEnum("report_status", [
  "open",
  "confirmed",
  "dismissed",
]);

export const moderationStatus = pgEnum("moderation_status", [
  "pending",
  "approved",
  "rejected",
]);

export const notificationChannel = pgEnum("notification_channel", [
  "inapp",
  "email",
]);

export const verificationMethod = pgEnum("verification_method", [
  "corporate_email",
  "dns_txt",
]);

export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "verified",
  "expired",
  "failed",
]);
