import { z } from "zod";

const limit = z.coerce.number().int().min(1).max(50).default(20);
const cursor = z.string().min(1).max(200).optional();

/** `GET /api/admin/users` */
export const listUsersQuery = z.object({
  cursor,
  limit,
  id: z.uuid().optional(),
  status: z.enum(["active", "suspended", "deleted"]).optional(),
  role: z.enum(["user", "admin"]).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuery>;

/** `GET /api/admin/companies` */
export const listCompaniesQuery = z.object({
  cursor,
  limit,
  status: z
    .enum([
      "unverified",
      "pending_verification",
      "verified",
      "rejected",
      "suspended",
    ])
    .optional(),
  q: z.string().trim().min(1).max(100).optional(),
});
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuery>;

/** `GET /api/admin/audit` */
export const listAuditQuery = z.object({
  cursor,
  limit,
  action: z.string().min(1).max(100).optional(),
  entityType: z.string().min(1).max(100).optional(),
  actorId: z.uuid().optional(),
});
export type ListAuditQuery = z.infer<typeof listAuditQuery>;

/** `GET /api/admin/taxonomy/suggestions` */
export const listSuggestionsQuery = z.object({ cursor, limit });

/** `POST /api/admin/taxonomy/suggestions/:id/map` */
export const mapSuggestionInput = z.object({ skillId: z.uuid() }).strict();

/** Optional note on suspend/unsuspend, kept in the audit diff. */
export const userActionInput = z
  .object({ note: z.string().trim().max(500).optional() })
  .strict();
export type UserActionInput = z.infer<typeof userActionInput>;
