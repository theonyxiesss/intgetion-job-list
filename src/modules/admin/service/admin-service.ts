import { recordAudit } from "@/lib/audit";
import { HttpError, notFound } from "@/lib/http";
import type { CurrentUser } from "@/modules/auth/service";
import { changeCompanyStatus } from "@/modules/companies/service";
import {
  listSkillSuggestions,
  mapSkillSuggestion,
  rejectSkillSuggestion,
} from "@/modules/taxonomy/service";
import * as repo from "../repo/admin-repo";
import type {
  ListAuditQuery,
  ListCompaniesQuery,
  ListUsersQuery,
  UserActionInput,
} from "../schemas";

/**
 * Admin actions (10A). Callers pass the admin from `requireAdmin`; every
 * write records an audit row with that admin as actor (16.1, P16).
 */

export type AdminUserDto = {
  id: string;
  platformRole: string;
  status: string;
  locale: string;
  createdAt: string;
  lastActiveAt: string | null;
};

export type AuditDto = {
  id: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  diff: unknown;
  createdAt: string;
};

function userDto(row: repo.AdminUserRow): AdminUserDto {
  return {
    id: row.id,
    platformRole: row.platformRole,
    status: row.status,
    locale: row.locale,
    createdAt: row.createdAt.toISOString(),
    lastActiveAt: row.lastActiveAt?.toISOString() ?? null,
  };
}

// ip_hash stays inside the database; the admin view does not need it.
function auditDto(row: repo.AuditRow): AuditDto {
  return {
    id: row.id,
    actorId: row.actorId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    diff: row.diff,
    createdAt: row.createdAt.toISOString(),
  };
}

function encodeCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(`${row.createdAt.toISOString()}|${row.id}`).toString(
    "base64url",
  );
}

function decodeCursor(cursor: string): repo.TimeCursor {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { createdAt, id };
}

function page<T extends { createdAt: Date; id: string }, D>(
  rows: T[],
  limit: number,
  map: (row: T) => D,
) {
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items: items.map(map),
    nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
  };
}

export async function listUsers(query: ListUsersQuery) {
  const rows = await repo.listUsers({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    id: query.id,
    status: query.status,
  });
  return page(rows, query.limit, userDto);
}

export async function listAudit(query: ListAuditQuery) {
  const rows = await repo.listAudit({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    action: query.action,
    entityType: query.entityType,
    actorId: query.actorId,
  });
  return page(rows, query.limit, auditDto);
}

/**
 * Suspends an active user. A suspended user has no session from the next
 * request on (getCurrentUser checks status). Admins cannot suspend
 * themselves or another admin (D80).
 */
export async function suspendUser(
  admin: CurrentUser,
  userId: string,
  input: UserActionInput,
  ip: string,
): Promise<AdminUserDto> {
  const target = await repo.findUser(userId);
  if (!target) throw notFound();
  if (target.id === admin.id || target.platformRole === "admin") {
    throw new HttpError(422, "ADMIN_PROTECTED", "Admins cannot be suspended");
  }
  const updated = await repo.setUserStatus(userId, "active", "suspended");
  if (!updated) {
    throw new HttpError(409, "INVALID_TRANSITION", "User is not active");
  }
  await recordAudit({
    actorId: admin.id,
    action: "admin.user_suspended",
    entityType: "user",
    entityId: userId,
    diff: { from: "active", to: "suspended", note: input.note ?? null },
    ip,
  });
  return userDto(updated);
}

export async function unsuspendUser(
  admin: CurrentUser,
  userId: string,
  input: UserActionInput,
  ip: string,
): Promise<AdminUserDto> {
  const target = await repo.findUser(userId);
  if (!target) throw notFound();
  const updated = await repo.setUserStatus(userId, "suspended", "active");
  if (!updated) {
    throw new HttpError(409, "INVALID_TRANSITION", "User is not suspended");
  }
  await recordAudit({
    actorId: admin.id,
    action: "admin.user_unsuspended",
    entityType: "user",
    entityId: userId,
    diff: { from: "suspended", to: "active", note: input.note ?? null },
    ip,
  });
  return userDto(updated);
}

export const listSuggestions = listSkillSuggestions;

export async function mapSuggestion(
  admin: CurrentUser,
  suggestionId: string,
  skillId: string,
  ip: string,
) {
  const suggestion = await mapSkillSuggestion(suggestionId, skillId);
  await recordAudit({
    actorId: admin.id,
    action: "admin.skill_suggestion_mapped",
    entityType: "skill_suggestion",
    entityId: suggestionId,
    diff: { normalized: suggestion.normalized, skillId },
    ip,
  });
  return suggestion;
}

export async function rejectSuggestion(
  admin: CurrentUser,
  suggestionId: string,
  ip: string,
) {
  const suggestion = await rejectSkillSuggestion(suggestionId);
  await recordAudit({
    actorId: admin.id,
    action: "admin.skill_suggestion_rejected",
    entityType: "skill_suggestion",
    entityId: suggestionId,
    diff: { normalized: suggestion.normalized },
    ip,
  });
  return suggestion;
}

export type AdminCompanyDto = {
  id: string;
  name: string;
  slug: string;
  status: string;
  origin: string;
  createdAt: string;
};

function companyDto(row: repo.AdminCompanyRow): AdminCompanyDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    origin: row.origin,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCompanies(query: ListCompaniesQuery) {
  const rows = await repo.listCompanies({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    status: query.status,
    q: query.q,
  });
  return page(rows, query.limit, companyDto);
}

type CompanyStatus =
  "unverified" | "pending_verification" | "verified" | "rejected" | "suspended";

const restorable = new Set<CompanyStatus>([
  "unverified",
  "pending_verification",
  "verified",
  "rejected",
]);

/**
 * Suspends a company (10A). The companies service records the status change
 * in audit_logs with the admin as actor (P16); public pages and listings
 * hide suspended companies and their jobs (D81).
 */
export async function suspendCompany(
  admin: CurrentUser,
  companyId: string,
): Promise<AdminCompanyDto> {
  const company = await repo.findCompany(companyId);
  if (!company) throw notFound();
  if (company.status === "suspended") {
    throw new HttpError(409, "INVALID_TRANSITION", "Company is suspended");
  }
  await changeCompanyStatus(companyId, admin.id, "suspended");
  return companyDto({ ...company, status: "suspended" });
}

/**
 * Lifts a suspension and restores the status the company had before it, as
 * recorded in audit_logs; without a record it falls back to `unverified`,
 * which asks for verification again (D81).
 */
export async function unsuspendCompany(
  admin: CurrentUser,
  companyId: string,
): Promise<AdminCompanyDto> {
  const company = await repo.findCompany(companyId);
  if (!company) throw notFound();
  if (company.status !== "suspended") {
    throw new HttpError(409, "INVALID_TRANSITION", "Company is not suspended");
  }
  const previous = await repo.findStatusBeforeSuspension(companyId);
  const status: CompanyStatus =
    previous && restorable.has(previous as CompanyStatus)
      ? (previous as CompanyStatus)
      : "unverified";
  await changeCompanyStatus(companyId, admin.id, status);
  return companyDto({ ...company, status });
}
