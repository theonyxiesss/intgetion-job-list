import { recordAudit } from "@/lib/audit";
import { HttpError, notFound } from "@/lib/http";
import type { CurrentUser } from "@/modules/auth/service";
import {
  approveCompanyVerification,
  changeCompanyStatus,
  notifyVerificationDecided,
} from "@/modules/companies/service";
import {
  findJobsForAdmin,
  removeJobByAdmin,
  republishImportedJob,
  transitionOwnedJob,
} from "@/modules/jobs/service";
import { enqueueMatchJob } from "@/modules/matching/service";
import { safeNotify } from "@/modules/notifications/service";
import * as repo from "../repo/queue-repo";
import { isOverdue, planDecision, type QueueTarget } from "./decide";

export type QueueItemDto = {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  riskFlags: unknown;
  createdAt: string;
  overdue: boolean;
  /** Short view of the entity; null when it no longer exists. */
  subject: {
    title: string;
    status: string;
    source?: string;
    riskScore?: number;
    companyName?: string;
  } | null;
};

function encodeCursor(row: { createdAt: Date; id: string }) {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string) {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { createdAt, id };
}

/** `GET /api/admin/queue`: pending items, oldest first, overdue marked. */
export async function listQueue(
  query: { cursor?: string; limit: number; entityType?: string },
  now = new Date(),
) {
  const rows = await repo.listPending({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    entityType: query.entityType,
  });
  const items = rows.slice(0, query.limit);
  const jobIds = items.filter((i) => i.entityType === "job");
  const companyIds = items.filter((i) => i.entityType === "company");
  const jobsById = new Map(
    (await findJobsForAdmin(jobIds.map((i) => i.entityId))).map((j) => [
      j.id,
      j,
    ]),
  );
  const companiesById = new Map(
    (await repo.findCompanies(companyIds.map((i) => i.entityId))).map((c) => [
      c.id,
      c,
    ]),
  );
  const last = items.at(-1);
  return {
    items: items.map((item): QueueItemDto => {
      const job = jobsById.get(item.entityId);
      const company = companiesById.get(item.entityId);
      return {
        id: item.id,
        entityType: item.entityType,
        entityId: item.entityId,
        reason: item.reason,
        riskFlags: item.riskFlags,
        createdAt: item.createdAt.toISOString(),
        overdue: isOverdue(item.createdAt, now),
        subject:
          item.entityType === "job" && job
            ? {
                title: job.title,
                status: job.status,
                source: job.source,
                riskScore: job.riskScore,
                companyName: job.companyName,
              }
            : item.entityType === "company" && company
              ? { title: company.name, status: company.status }
              : null,
      };
    }),
    nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
  };
}

async function targetOf(item: repo.QueueRow): Promise<QueueTarget> {
  if (item.entityType === "job") {
    const [job] = await findJobsForAdmin([item.entityId]);
    return job
      ? { kind: "job", source: job.source, status: job.status }
      : { kind: "missing" };
  }
  if (item.entityType === "company") {
    const [company] = await repo.findCompanies([item.entityId]);
    return company
      ? { kind: "company", status: company.status, reason: item.reason }
      : { kind: "missing" };
  }
  return { kind: "missing" };
}

/**
 * `POST /api/admin/queue/:id/decide` (14.4). A rejection needs a note,
 * which the employer sees. The item is claimed first so two admins cannot
 * both act; if acting on the entity fails, the claim is released.
 */
export async function decideQueueItem(
  admin: CurrentUser,
  itemId: string,
  input: { decision: "approved" | "rejected"; note?: string },
  ip: string,
) {
  const note = input.note?.trim() || null;
  if (input.decision === "rejected" && !note) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "A rejection reason is required",
    );
  }
  const existing = await repo.findItem(itemId);
  if (!existing) throw notFound();
  const item = await repo.claimItem(itemId, input.decision, admin.id, note);
  if (!item) {
    throw new HttpError(409, "ALREADY_DECIDED", "Item is already decided");
  }

  const target = await targetOf(item);
  const effect = planDecision(target, input.decision);
  try {
    switch (effect) {
      case "approve_job":
        await transitionOwnedJob(item.entityId, "approve", admin.id, "admin");
        await enqueueMatchJob(item.entityId);
        break;
      case "reject_job":
        await transitionOwnedJob(
          item.entityId,
          "reject",
          admin.id,
          "admin",
          note ?? undefined,
        );
        break;
      case "remove_job":
        await removeJobByAdmin(item.entityId, admin.id, note ?? "moderation");
        break;
      case "republish_imported":
        await republishImportedJob(item.entityId, admin.id);
        break;
      case "verify_company":
        await approveCompanyVerification(item.entityId, admin.id);
        break;
      case "reject_company":
        await changeCompanyStatus(item.entityId, admin.id, "rejected");
        break;
      case "none":
        break;
    }
  } catch (error) {
    await repo.releaseItem(item.id);
    throw error;
  }
  await repo.closeSiblings(item, input.decision, admin.id, note);
  await recordAudit({
    actorId: admin.id,
    action: "admin.queue_decided",
    entityType: item.entityType,
    entityId: item.entityId,
    diff: { itemId: item.id, decision: input.decision, effect, note },
    ip,
  });
  await notifyDecision(item.entityId, effect);
  return { id: item.id, status: item.status, effect };
}

/**
 * Section 15: the job creator hears about approval, rejection or takedown;
 * owners hear about a rejected verification (approval notifies inside
 * `approveCompanyVerification`). Imported jobs have no creator.
 */
async function notifyDecision(entityId: string, effect: string) {
  if (effect === "reject_company") {
    await notifyVerificationDecided(entityId, "rejected");
    return;
  }
  if (!["approve_job", "reject_job", "remove_job"].includes(effect)) return;
  const [job] = await findJobsForAdmin([entityId]);
  if (!job?.createdBy) return;
  await safeNotify("job.moderation_decided", [job.createdBy], {
    jobId: job.id,
    jobTitle: job.title,
    decision: effect === "approve_job" ? "approved" : "rejected",
  });
}

/** `POST /api/admin/jobs/:id/remove`, any source (section 7). */
export async function removeJob(
  admin: CurrentUser,
  jobId: string,
  reason: string,
  ip: string,
) {
  const change = await removeJobByAdmin(jobId, admin.id, reason);
  await recordAudit({
    actorId: admin.id,
    action: "admin.job_removed",
    entityType: "job",
    entityId: jobId,
    diff: { ...change, reason },
    ip,
  });
  return change;
}

export const countPendingQueue = repo.countPending;
