import { recordAudit } from "@/lib/audit";
import { HttpError, notFound } from "@/lib/http";
import type { CurrentUser } from "@/modules/auth/service";
import {
  getOrdersForModeration,
  getServicesForModeration,
} from "@/modules/freelance/service";
import { pausePublishedJobsOfCompany } from "@/modules/jobs/service";
import { safeNotify } from "@/modules/notifications/service";
import * as repo from "../repo/reports-repo";

const REPORTED_ENTITIES = [
  "job",
  "company",
  "user",
  "freelance_service",
  "freelance_order",
] as const;

const reportedEntity = (
  type: string,
): type is (typeof REPORTED_ENTITIES)[number] =>
  (REPORTED_ENTITIES as readonly string[]).includes(type);

/** 14.5: this many confirmed reports in the window pause the company. */
export const AUTO_PAUSE_THRESHOLD = 3;
export const AUTO_PAUSE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function reachesAutoPause(confirmedInWindow: number): boolean {
  return confirmedInWindow >= AUTO_PAUSE_THRESHOLD;
}

export type AdminReportDto = {
  id: string;
  entityType: string;
  entityId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  jobTitle: string | null;
  companyId: string | null;
  companyName: string | null;
  /** Freelance service behind a service or order complaint (28.9). */
  serviceId: string | null;
  serviceTitle: string | null;
};

const encodeCursor = (row: { createdAt: Date; id: string }) =>
  Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString("base64url");

function decodeCursor(cursor: string) {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { createdAt, id };
}

/** `GET /api/admin/reports`: open reports first in age order (reporter id is not shown). */
export async function listReports(query: {
  cursor?: string;
  limit: number;
  status: "open" | "confirmed" | "dismissed";
}) {
  const rows = await repo.listReports({
    limit: query.limit + 1,
    status: query.status,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
  });
  const items = rows.slice(0, query.limit);
  const last = items.at(-1);
  const services = await freelanceSubjects(items);
  return {
    items: items.map((row): AdminReportDto => ({
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      jobTitle: row.jobTitle,
      companyId: row.companyId,
      companyName: row.companyName,
      serviceId: services.get(row.entityId)?.id ?? null,
      serviceTitle: services.get(row.entityId)?.title ?? null,
    })),
    nextCursor: rows.length > query.limit && last ? encodeCursor(last) : null,
  };
}

/** Report entity id → the freelance service it is about, with its title. */
async function freelanceSubjects(
  rows: readonly { entityType: string; entityId: string }[],
): Promise<Map<string, { id: string; title: string }>> {
  const out = new Map<string, { id: string; title: string }>();
  const serviceIds = rows
    .filter((row) => row.entityType === "freelance_service")
    .map((row) => row.entityId);
  const orderIds = rows
    .filter((row) => row.entityType === "freelance_order")
    .map((row) => row.entityId);
  for (const service of await getServicesForModeration(serviceIds)) {
    out.set(service.id, { id: service.id, title: service.title });
  }
  for (const order of await getOrdersForModeration(orderIds)) {
    if (order.serviceId) {
      out.set(order.id, { id: order.serviceId, title: order.serviceTitle });
    }
  }
  return out;
}

/**
 * `POST /api/admin/reports/:id/decide` (14.5, D84). A confirmed report that
 * brings the company to 3 confirmed reports in 30 days pauses all its
 * published jobs and puts the company in the moderation queue.
 */
export async function decideReport(
  admin: CurrentUser,
  reportId: string,
  input: { decision: "confirmed" | "dismissed"; note?: string },
  ip: string,
  now = new Date(),
) {
  const existing = await repo.findReport(reportId);
  if (!existing) throw notFound();
  const report = await repo.claimReport(reportId, input.decision, admin.id);
  if (!report) {
    throw new HttpError(409, "ALREADY_DECIDED", "Report is already decided");
  }
  const note = input.note?.trim() || null;
  await recordAudit({
    actorId: admin.id,
    action: "admin.report_decided",
    entityType: report.entityType,
    entityId: report.entityId,
    diff: { reportId: report.id, decision: input.decision, note },
    ip,
  });
  if (reportedEntity(report.entityType)) {
    await safeNotify("report.decided", [report.reporterId], {
      reportId: report.id,
      entityType: report.entityType,
      decision: input.decision,
    });
  }

  let pausedJobs: string[] = [];
  const companyId =
    input.decision === "confirmed" ? await repo.companyOfReport(report) : null;
  if (companyId) {
    const since = new Date(now.getTime() - AUTO_PAUSE_WINDOW_MS);
    const confirmed = await repo.confirmedReportsForCompany(companyId, since);
    if (reachesAutoPause(confirmed)) {
      pausedJobs = await pausePublishedJobsOfCompany(
        companyId,
        admin.id,
        "auto_pause_reports",
      );
      await repo.queueCompanyOnce(companyId, "reports_threshold");
      if (pausedJobs.length) {
        await recordAudit({
          actorId: admin.id,
          action: "company.auto_paused",
          entityType: "company",
          entityId: companyId,
          diff: { confirmedReports: confirmed, pausedJobs: pausedJobs.length },
          ip,
        });
      }
    }
  }
  return {
    id: report.id,
    status: report.status,
    pausedJobs: pausedJobs.length,
  };
}

export const countOpenReports = repo.countOpenReports;
