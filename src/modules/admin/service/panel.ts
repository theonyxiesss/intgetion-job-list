import { HttpError } from "@/lib/http";
import type { ListCompaniesQuery } from "../schemas";
import * as panel from "../repo/panel-repo";

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): panel.TimeCursor {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { createdAt, id };
}

function page<T extends { createdAt: Date; id: string }>(
  rows: T[],
  limit: number,
) {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function countNewUsers(): Promise<number> {
  return panel.countUsersSince(new Date(Date.now() - WEEK_MS));
}

export async function countPublishedJobs(): Promise<number> {
  return panel.countPublishedJobs();
}

export async function listCompaniesPanel(
  query: ListCompaniesQuery & { limit: number },
) {
  const rows = await panel.listCompaniesPanel({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    status: query.status,
    q: query.q,
  });
  return page(rows, query.limit);
}

export async function getCompanyPanel(id: string) {
  const company = await panel.findCompanyPanel(id);
  if (!company) return null;
  const [members, companyJobs, verifications] = await Promise.all([
    panel.listCompanyMembers(id),
    panel.listCompanyJobs(id, 20),
    panel.listCompanyVerifications(id),
  ]);
  return { company, members, jobs: companyJobs, verifications };
}

export async function listJobsPanel(query: {
  limit: number;
  cursor?: string;
  q?: string;
  status?: panel.PanelJobRow["status"];
  source?: panel.PanelJobRow["source"];
  company?: string;
}) {
  const rows = await panel.listJobsPanel({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    q: query.q,
    status: query.status,
    source: query.source,
    company: query.company,
  });
  return page(rows, query.limit);
}

export async function getUserPanel(id: string) {
  const user = await panel.findUserPanel(id);
  if (!user) return null;
  const [memberships, applicationCount, audit] = await Promise.all([
    panel.listUserCompanies(id),
    panel.countUserApplications(id),
    panel.listAuditForUser(id, 10),
  ]);
  return { user, memberships, applicationCount, audit };
}
