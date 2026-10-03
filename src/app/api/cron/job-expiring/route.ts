import { timingSafeEqual } from "node:crypto";
import { notFound, toErrorResponse } from "@/lib/http";
import { listJobsExpiring } from "@/modules/jobs/service";
import {
  hasJobExpiringNotice,
  safeNotify,
} from "@/modules/notifications/service";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function GET(request: Request) {
  try {
    if (!authorized(request)) throw notFound();
    const due = await listJobsExpiring();
    let notified = 0;
    for (const job of due) {
      if (!job.createdBy || !job.expiresAt) continue;
      if (await hasJobExpiringNotice(job.id)) continue;
      await safeNotify("job.expiring", [job.createdBy], {
        jobId: job.id,
        jobTitle: job.title,
        expiresAt: job.expiresAt.toISOString(),
      });
      notified += 1;
    }
    return Response.json({ ok: true, notified });
  } catch (error) {
    return toErrorResponse(error);
  }
}
