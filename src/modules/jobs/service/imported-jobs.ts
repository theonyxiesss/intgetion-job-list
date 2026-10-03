import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { jobSkills, jobStatusHistory, jobs } from "@/db/schema";

export type ImportedJobWrite = {
  jobId?: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  skillIds: string[];
  applyUrl: string;
  expiresAt: Date | null;
  status: "published" | "expired" | "removed";
  reason: string;
};

/** Writes trusted, normalized ingestion output; callers cannot write internal jobs. */
export async function saveImportedJob(input: ImportedJobWrite) {
  return getDb().transaction(async (tx) => {
    const [previous] = input.jobId
      ? await tx.select().from(jobs).where(eq(jobs.id, input.jobId)).limit(1)
      : [];
    if (previous && previous.source !== "imported")
      throw new Error("Imported jobs cannot overwrite an internal job");
    const now = new Date();
    const values = {
      companyId: input.companyId,
      title: input.title,
      description: input.description,
      category: input.category as never,
      applicationMethod: "external_url" as const,
      applicationUrl: input.applyUrl,
      source: "imported" as const,
      status: input.status,
      publishedAt: input.status === "published" ? previous?.publishedAt ?? now : null,
      expiresAt: input.expiresAt,
      importedAt: now,
      createdBy: null,
      riskScore: input.status === "removed" ? 4 : 0,
      riskFlags: input.status === "removed" ? [input.reason] : [],
    };
    const [job] = previous
      ? await tx.update(jobs).set(values).where(eq(jobs.id, previous.id)).returning()
      : await tx.insert(jobs).values(values).returning();
    if (!job) throw new Error("Imported job write returned no row");
    await tx.delete(jobSkills).where(eq(jobSkills.jobId, job.id));
    if (input.skillIds.length)
      await tx.insert(jobSkills).values(
        [...new Set(input.skillIds)].map((skillId) => ({
          jobId: job.id,
          skillId,
          weight: 2,
        })),
      );
    if (!previous || previous.status !== job.status)
      await tx.insert(jobStatusHistory).values({
        jobId: job.id,
        fromStatus: previous?.status ?? null,
        toStatus: job.status,
        actorId: null,
        reason: input.reason,
      });
    return job;
  });
}

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
      .returning({ id: jobs.id, status: jobs.status });
    for (const row of expired)
      await tx.insert(jobStatusHistory).values({
        jobId: row.id,
        fromStatus: "published",
        toStatus: "expired",
        actorId: null,
        reason: "missing_from_two_source_runs",
      });
    return expired.length;
  });
}
