import { listActiveCandidateIds } from "@/modules/applications/service";
import { safeNotify } from "@/modules/notifications/service";
import { transitionOwnedJob as transitionInRepo } from "../repo/jobs-repo";

type TransitionArgs = Parameters<typeof transitionInRepo>;

/** Closes through the existing machine, then tells active candidates (D128). */
export async function transitionOwnedJob(
  ...args: TransitionArgs
): Promise<Awaited<ReturnType<typeof transitionInRepo>>> {
  const job = await transitionInRepo(...args);
  if (job.status === "closed") {
    const recipientIds = await listActiveCandidateIds(job.id);
    await safeNotify("job.closed", recipientIds, {
      jobId: job.id,
      jobTitle: job.title,
    });
  }
  return job;
}
