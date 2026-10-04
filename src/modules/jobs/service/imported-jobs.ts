import { and, eq, inArray } from "drizzle-orm";
import {
  isSensitiveSector,
  type Perk,
  type Sector,
  type Seniority,
} from "@/config/markers";
import { getDb } from "@/db/client";
import { jobSkills, jobStatusHistory, jobs } from "@/db/schema";

export type ImportedJobStatus = "published" | "expired" | "removed";

export type ImportedJobWrite = {
  /** Existing imported job to update (same source or a merged duplicate). */
  jobId?: string;
  companyId: string;
  title: string;
  description: string;
  category: (typeof jobs.$inferInsert)["category"];
  employmentType: NonNullable<(typeof jobs.$inferInsert)["employmentType"]>;
  timeZone: string | null;
  skillIds: string[];
  sectors?: Sector[];
  seniority?: Seniority | null;
  perks?: Perk[];
  applyUrl: string;
  expiresAt: Date | null;
  status: ImportedJobStatus;
  reason: string;
};

/**
 * Writes normalized ingestion output (8A). Only imported jobs: an internal
 * job is never overwritten, and employers cannot edit these (D9).
 */
export async function saveImportedJob(input: ImportedJobWrite) {
  return getDb().transaction(async (tx) => {
    const [previous] = input.jobId
      ? await tx.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)
      : [];
    if (previous && previous.source !== "imported") {
      throw new Error("Imported jobs cannot overwrite an internal job");
    }
    const now = new Date();
    const removed = input.status === "removed";
    const sensitive =
      input.status === "published" && isSensitiveSector(input.sectors ?? []);
    const status: ImportedJobStatus | "pending_moderation" = sensitive
      ? "pending_moderation"
      : input.status;
    const values = {
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      category: input.category,
      employmentType: input.employmentType,
      sectors: input.sectors ?? [],
      seniority: input.seniority ?? null,
      perks: input.perks ?? [],
      workFormat: "remote" as const,
      timezoneRequired: input.timeZone,
      applicationMethod: "external_url" as const,
      applicationUrl: input.applyUrl,
      source: "imported" as const,
      status,
      publishedAt:
        status === "published" ? (previous?.publishedAt ?? now) : null,
      expiresAt: input.expiresAt,
      importedAt: now,
      createdBy: null,
      riskScore: removed ? 4 : 0,
      riskFlags: removed ? [input.reason] : [],
    };
    const [job] = previous
      ? await tx
          .update(jobs)
          .set({ ...values, updatedAt: now })
          .where(eq(jobs.id, previous.id))
          .returning()
      : await tx.insert(jobs).values(values).returning();
    if (!job) throw new Error("Imported job write returned no row");

    await tx.delete(jobSkills).where(eq(jobSkills.jobId, job.id));
    const skillIds = [...new Set(input.skillIds)];
    if (skillIds.length) {
      await tx
        .insert(jobSkills)
        .values(
          skillIds.map((skillId) => ({ jobId: job.id, skillId, weight: 2 })),
        );
    }
    if (!previous || previous.status !== job.status) {
      await tx.insert(jobStatusHistory).values({
        jobId: job.id,
        fromStatus: previous?.status ?? null,
        toStatus: job.status,
        actorId: null,
        reason: input.reason,
      });
    }
    return job;
  });
}

/** 13.4: published imported jobs missing from their sources become expired. */
export async function expireImportedJobs(jobIds: string[]) {
  if (!jobIds.length) return 0;
  return getDb().transaction(async (tx) => {
    const expired = await tx
      .update(jobs)
      .set({ status: "expired", updatedAt: new Date() })
      .where(
        and(
          inArray(jobs.id, jobIds),
          eq(jobs.source, "imported"),
          eq(jobs.status, "published"),
        ),
      )
      .returning({ id: jobs.id });
    for (const row of expired) {
      await tx.insert(jobStatusHistory).values({
        jobId: row.id,
        fromStatus: "published",
        toStatus: "expired",
        actorId: null,
        reason: "missing_from_source_runs",
      });
    }
    return expired.length;
  });
}
