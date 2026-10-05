import { z } from "zod";
import { HttpError, notFound } from "@/lib/http";
import { privacyHash } from "@/lib/privacy-hash";
import {
  getAuthUserEmail,
  getAuthUserLoginEmail,
  sendPasswordRecovery,
  signOutAuthUser,
} from "@/lib/supabase/admin";
import { deleteMyAccount } from "@/modules/privacy/service";
import type { CurrentUser } from "@/modules/auth/service";
import * as repo from "../people-repo";

const reason = z.string().trim().min(3).max(500);
export const reasonInput = z.object({ reason }).strict();
export const noteInput = z
  .object({ body: z.string().trim().min(1).max(2000) })
  .strict();
export const peopleQuery = z.object({
  cursor: z.string().min(1).max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(["active", "suspended", "deleted", "banned"]).optional(),
  role: z.enum(["candidate", "employer", "both"]).optional(),
  locale: z.enum(["en", "ru"]).optional(),
  q: z.string().trim().min(1).max(200).optional(),
});
export const decisionInput = z
  .object({ decision: z.enum(["approved", "rejected"]) })
  .strict();

export type PeopleQuery = z.infer<typeof peopleQuery>;

/** The requester cannot approve their own ban or deletion (D295). */
export function isOwnApproval(requestedBy: string, actorId: string): boolean {
  return requestedBy === actorId;
}

export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const tail = digits.slice(-4).padStart(4, "0");
  return `+* *** ***-${tail.slice(0, 2)}-${tail.slice(2)}`;
}

export function maskHandle(value: string): string {
  if (!value) return "***";
  return `${value.slice(0, 1)}***`;
}

function asDate(value: unknown): Date {
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error("bad timestamp");
  return date;
}

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString("base64url");
}

function decodeCursor(cursor: string): repo.PeopleCursor {
  const [at, id] = Buffer.from(cursor, "base64url").toString("utf8").split("|");
  const createdAt = new Date(at ?? "");
  if (!z.uuid().safeParse(id).success || Number.isNaN(createdAt.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
  }
  return { createdAt, id: id! };
}

function roleOf(candidate: boolean, employer: boolean): string {
  if (candidate && employer) return "both";
  if (employer) return "employer";
  if (candidate) return "candidate";
  return "user";
}

async function identity(authUid: string) {
  const [loginEmail, mailEmail] = await Promise.all([
    getAuthUserLoginEmail(authUid),
    getAuthUserEmail(authUid),
  ]);
  return { loginEmail, mailEmail };
}

/** True when this email or Telegram id is on the blocklist (D297). */
export async function registrationBlocked(input: {
  email?: string | null;
  telegramId?: string | null;
}): Promise<boolean> {
  if (
    input.email &&
    (await repo.blocklisted("email", privacyHash(input.email)))
  ) {
    return true;
  }
  if (
    input.telegramId &&
    (await repo.blocklisted("telegram", privacyHash(input.telegramId)))
  ) {
    return true;
  }
  return false;
}

export async function listPeople(query: PeopleQuery) {
  const q = query.q?.trim();
  const id = q && z.uuid().safeParse(q).success ? q : undefined;
  const rows = await repo.listPeople({
    limit: query.limit + 1,
    cursor: query.cursor ? decodeCursor(query.cursor) : undefined,
    status: query.status,
    role: query.role,
    locale: query.locale,
    id,
    name: q && !id && !q.includes("@") ? q.replace(/[\\%_]/g, "") : undefined,
  });
  let items = rows;
  if (q?.includes("@")) {
    const hashed = privacyHash(q);
    const matched = [];
    for (const row of rows) {
      const email = await getAuthUserLoginEmail(String(row.auth_uid));
      if (email && privacyHash(email) === hashed) matched.push(row);
    }
    items = matched;
  }
  const page = items.slice(0, query.limit);
  const last = page.at(-1);
  const emails = await Promise.all(
    page.map((row) => getAuthUserEmail(String(row.auth_uid))),
  );
  return {
    items: page.map((row, index) => {
      const email = emails[index];
      const createdAt = asDate(row.created_at);
      return {
        id: String(row.id),
        name: row.full_name ? String(row.full_name) : null,
        status: String(row.status),
        locale: String(row.locale),
        role: roleOf(Boolean(row.candidate), Boolean(row.employer)),
        email: email ? maskEmail(email) : null,
        telegram: row.telegram_username
          ? maskHandle(String(row.telegram_username))
          : null,
        createdAt: createdAt.toISOString(),
      };
    }),
    nextCursor:
      items.length > query.limit && last
        ? encodeCursor(asDate(last.created_at), String(last.id))
        : null,
  };
}

export async function personCard(id: string) {
  const [row] = await repo.findPerson(id);
  if (!row) throw notFound();
  const [members, notes, ban, deletion, emails] = await Promise.all([
    repo.membershipsOf(id),
    repo.notesOf("user", id),
    repo.openApproval("users.ban", id),
    repo.openApproval("users.delete", id),
    identity(String(row.auth_uid)),
  ]);
  return {
    id: String(row.id),
    authUid: String(row.auth_uid),
    status: String(row.status),
    locale: String(row.locale),
    platformRole: String(row.platform_role),
    name: row.full_name ? String(row.full_name) : null,
    headline: row.headline ? String(row.headline) : null,
    completeness: row.completeness == null ? null : Number(row.completeness),
    hidden: Boolean(row.is_hidden),
    createdAt: asDate(row.created_at).toISOString(),
    lastActiveAt: row.last_active_at
      ? asDate(row.last_active_at).toISOString()
      : null,
    termsVersion: String(row.terms_version),
    marketingOptIn: Boolean(row.marketing_opt_in),
    email: emails.mailEmail ? maskEmail(emails.mailEmail) : null,
    phone: row.phone ? maskPhone(String(row.phone)) : null,
    telegram: row.telegram_username
      ? maskHandle(String(row.telegram_username))
      : row.telegram_id
        ? maskHandle(String(row.telegram_id))
        : null,
    companies: members.map((member) => ({
      id: String(member.id),
      name: String(member.name),
      slug: String(member.slug),
      role: String(member.role),
    })),
    notes: notes.map(noteDto),
    approvals: [...ban, ...deletion].map((item) => ({
      id: String(item.id),
      action: String(item.action),
      reason: String(item.reason),
      requestedBy: String(item.requested_by),
    })),
  };
}

function noteDto(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    body: String(row.body),
    authorId: String(row.author_id),
    author: row.full_name ? String(row.full_name) : null,
    createdAt: asDate(row.created_at).toISOString(),
  };
}

async function rememberIdentity(
  userId: string,
  authUid: string,
  reasonText: string,
  actorId: string,
) {
  const { loginEmail } = await identity(authUid);
  const [person] = await repo.findPerson(userId);
  if (loginEmail) {
    await repo.insertBlock(
      "email",
      privacyHash(loginEmail),
      userId,
      reasonText,
      actorId,
    );
  }
  if (person?.telegram_id) {
    await repo.insertBlock(
      "telegram",
      privacyHash(String(person.telegram_id)),
      userId,
      reasonText,
      actorId,
    );
  }
}

export async function revealPerson(id: string) {
  await personCard(id);
  const [row] = await repo.findPerson(id);
  const loginEmail = row
    ? (await identity(String(row.auth_uid))).loginEmail
    : null;
  return {
    email:
      loginEmail && !loginEmail.endsWith("@telegram.intgetion.com")
        ? loginEmail
        : null,
    phone: row?.phone ? String(row.phone) : null,
    telegram: row?.telegram_username
      ? String(row.telegram_username)
      : row?.contact_telegram
        ? String(row.contact_telegram)
        : row?.telegram_id
          ? String(row.telegram_id)
          : null,
  };
}

export async function addUserNote(
  actorId: string,
  userId: string,
  body: string,
) {
  await personCard(userId);
  const [note] = await repo.addNote({
    entityType: "user",
    entityId: userId,
    body,
    authorId: actorId,
  });
  if (!note) throw notFound();
  return noteDto(note);
}

export async function signOutPerson(id: string) {
  const card = await personCard(id);
  const result = await signOutAuthUser(card.authUid);
  return { signedOut: result };
}

export async function resetPersonPassword(id: string) {
  const card = await personCard(id);
  const [row] = await repo.findPerson(id);
  const loginEmail = row
    ? (await identity(String(row.auth_uid))).loginEmail
    : null;
  if (!loginEmail || loginEmail.endsWith("@telegram.intgetion.com")) {
    throw new HttpError(422, "NO_EMAIL", "This account has no email");
  }
  const result = await sendPasswordRecovery(loginEmail);
  return { recovery: result, userId: card.id };
}

export async function requestFourEyes(input: {
  action: "users.ban" | "users.delete";
  userId: string;
  reason: string;
  actorId: string;
}) {
  const card = await personCard(input.userId);
  if (card.platformRole === "admin" || card.id === input.actorId) {
    throw new HttpError(422, "ADMIN_PROTECTED", "Admins cannot be banned");
  }
  if (card.status === "deleted") throw notFound();
  const existing = await repo.openApproval(input.action, input.userId);
  if (existing[0]) {
    return {
      id: String(existing[0].id),
      requestedBy: String(existing[0].requested_by),
      pending: true as const,
    };
  }
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const [row] = await repo.insertApproval({
    action: input.action,
    entityId: input.userId,
    reason: input.reason,
    requestedBy: input.actorId,
    expiresAt: expires,
  });
  if (!row) throw notFound();
  return {
    id: String(row.id),
    requestedBy: input.actorId,
    pending: true as const,
  };
}

async function executeBan(userId: string, reasonText: string, actorId: string) {
  const card = await personCard(userId);
  await rememberIdentity(userId, card.authUid, reasonText, actorId);
  const changed =
    (await repo.setStatusFrom(userId, "active", "banned")) ||
    (await repo.setStatusFrom(userId, "suspended", "banned"));
  if (!changed && card.status !== "banned") {
    throw new HttpError(409, "INVALID_TRANSITION", "User cannot be banned");
  }
  await signOutAuthUser(card.authUid);
}

async function executeDelete(
  userId: string,
  reasonText: string,
  actorId: string,
  ip: string | null,
) {
  const card = await personCard(userId);
  await rememberIdentity(userId, card.authUid, reasonText, actorId);
  await deleteMyAccount(
    { id: userId, platformRole: "user" } as CurrentUser,
    ip,
  );
}

export async function approvalOf(id: string) {
  const [row] = await repo.findApproval(id);
  if (!row || row.decided_at) throw notFound();
  return {
    id: String(row.id),
    action: String(row.action) as "users.ban" | "users.delete",
    reason: String(row.reason),
    userId: String(row.entity_id),
  };
}

export async function decideFourEyes(input: {
  approvalId: string;
  actorId: string;
  decision: "approved" | "rejected";
  ip: string | null;
}) {
  const [row] = await repo.findApproval(input.approvalId);
  if (!row || row.decided_at) throw notFound();
  if (asDate(row.expires_at).getTime() <= Date.now()) throw notFound();
  const requestedBy = String(row.requested_by);
  if (isOwnApproval(requestedBy, input.actorId)) {
    throw new HttpError(422, "FOUR_EYES", "A second admin has to confirm this");
  }
  const action = String(row.action) as "users.ban" | "users.delete";
  const userId = String(row.entity_id);
  if (input.decision === "approved" && action === "users.ban") {
    await executeBan(userId, String(row.reason), input.actorId);
  }
  if (input.decision === "approved" && action === "users.delete") {
    await executeDelete(userId, String(row.reason), input.actorId, input.ip);
  }
  const saved = await repo.decideApproval(
    input.approvalId,
    input.actorId,
    input.decision,
  );
  if (!saved) throw notFound();
  return { id: input.approvalId, action, userId, decision: input.decision };
}

export async function companyDetail(id: string) {
  const [row] = await repo.companyCard(id);
  if (!row) throw notFound();
  const [members, notes] = await Promise.all([
    repo.companyMembers(id),
    repo.notesOf("company", id),
  ]);
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    domain: row.domain ? String(row.domain) : null,
    status: String(row.status),
    trusted: Boolean(row.is_trusted),
    description: row.description ? String(row.description) : null,
    country: row.country ? String(row.country) : null,
    createdAt: asDate(row.created_at).toISOString(),
    jobsPublished: Number(row.jobs_published),
    jobsTotal: Number(row.jobs_total),
    members: members.map((member) => ({
      id: String(member.id),
      name: member.full_name ? String(member.full_name) : null,
      role: String(member.role),
    })),
    notes: notes.map(noteDto),
  };
}

export async function jobDetail(id: string) {
  const [row] = await repo.jobCard(id);
  if (!row) throw notFound();
  return {
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    source: String(row.source),
    category: String(row.category),
    publishedAt: row.published_at
      ? asDate(row.published_at).toISOString()
      : null,
    expiresAt: row.expires_at ? asDate(row.expires_at).toISOString() : null,
    applications: Number(row.applications),
    company: {
      id: String(row.company_id),
      name: String(row.company_name),
      slug: String(row.company_slug),
    },
  };
}
