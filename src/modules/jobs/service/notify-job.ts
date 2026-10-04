import { listActiveCandidateIds } from "@/modules/applications/service";
import { enqueueMatchingForJob } from "@/modules/matching/service";
import { safeNotify } from "@/modules/notifications/service";
import { transitionOwnedJob as transitionInRepo } from "../repo/jobs-repo";

type TransitionArgs = Parameters<typeof transitionInRepo>;

/**
 * Runs the existing machine, then tells active candidates of a closed job
 * (D128) and queues a published one for the matching recompute (D161):
 * publish, moderation approve and extend all land here.
 */
export async function transitionOwnedJob(
  ...args: TransitionArgs
): Promise<Awaited<ReturnType<typeof transitionInRepo>>> {
  const job = await transitionInRepo(...args);
  if (job.status === "published") await enqueueMatchingForJob(job.id);
  if (job.status === "closed") {
    const recipientIds = await listActiveCandidateIds(job.id);
    await safeNotify("job.closed", recipientIds, {
      jobId: job.id,
      jobTitle: job.title,
    });
  }
  return job;
}
