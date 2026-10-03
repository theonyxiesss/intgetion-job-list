import { HttpError } from "@/lib/http";
import { listJobsForAdmin } from "@/modules/jobs/service";
import type { z } from "zod";
import type { listAdminJobsQuery } from "../schemas";

export type AdminJobDto = {
  id: string;
  title: string;
  status: string;
  source: string;
  riskScore: number;
  companyId: string;
  companyName: string;
  createdAt: string;
};

/** `GET /api/admin/jobs`: every source and status, newest first. */
export async function listAdminJobs(query: z.infer<typeof listAdminJobsQuery>) {
  let cursor: { createdAt: Date; id: string } | undefined;
  if (query.cursor) {
    const [at, id] = Buffer.from(query.cursor, "base64url")
      .toString("utf8")
      .split("|");
    const createdAt = new Date(at ?? "");
    if (!id || Number.isNaN(createdAt.getTime())) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid cursor");
    }
    cursor = { createdAt, id };
  }
  const rows = await listJobsForAdmin({
    limit: query.limit + 1,
    cursor,
    q: query.q,
    status: query.status,
    source: query.source,
  });
  const items = rows.slice(0, query.limit);
  const last = items.at(-1);
  return {
    items: items.map((row): AdminJobDto => ({
      id: row.id,
      title: row.title,
      status: row.status,
      source: row.source,
      riskScore: row.riskScore,
      companyId: row.companyId,
      companyName: row.companyName,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor:
      rows.length > query.limit && last
        ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`).toString(
            "base64url",
          )
        : null,
  };
}
