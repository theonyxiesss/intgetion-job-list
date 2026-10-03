import { z } from "zod";

const limit = z.coerce.number().int().min(1).max(50).default(20);
const cursor = z.string().min(1).max(200).optional();

/** `GET /api/admin/queue` */
export const listQueueQuery = z.object({
  cursor,
  limit,
  entityType: z.enum(["job", "company"]).optional(),
});

/** `POST /api/admin/queue/:id/decide` — a rejection needs a note (14.4). */
export const decideInput = z
  .object({
    decision: z.enum(["approved", "rejected"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

/** `GET /api/admin/jobs` */
export const listAdminJobsQuery = z.object({
  cursor,
  limit,
  q: z.string().trim().min(1).max(100).optional(),
  status: z
    .enum([
      "draft",
      "pending_moderation",
      "published",
      "paused",
      "expired",
      "closed",
      "removed",
    ])
    .optional(),
  source: z.enum(["internal", "imported"]).optional(),
});

/** `POST /api/admin/jobs/:id/remove` */
export const removeJobInput = z
  .object({ reason: z.string().trim().min(3).max(500) })
  .strict();

/** `GET /api/admin/reports` */
export const listReportsQuery = z.object({
  cursor,
  limit,
  status: z.enum(["open", "confirmed", "dismissed"]).default("open"),
});

/** `POST /api/admin/reports/:id/decide` */
export const decideReportInput = z
  .object({
    decision: z.enum(["confirmed", "dismissed"]),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();
