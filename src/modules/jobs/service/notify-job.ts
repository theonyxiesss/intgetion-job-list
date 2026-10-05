import { listActiveCandidateIds } from "@/modules/applications/service";
import { safeNotify } from "@/modules/notifications/service";
import { submitToIndexNow } from "@/modules/seo/indexnow";
import { transitionOwnedJob as transitionInRepo } from "../repo/jobs-repo";

type TransitionArgs = Parameters<typeof transitionInRepo>;

const PUBLISH_ACTIONS = new Set(["publish", "approve", "extend"]);

/** Closes through the existing machine, then tells active candidates (D128). */
export async function transitionOwnedJob(
  ...args: TransitionArgs
): Promise<Awaited<ReturnType<typeof transitionInRepo>>> {
  const job = await transitionInRepo(...args);
  const action = args[1];
  // Search engines hear about the change right away (D284). Fire and forget:
  // a refused ping must never fail publishing.
  void submitToIndexNow([`/jobs/${job.id}`]);
  if (PUBLISH_ACTIONS.has(action) && job.status === "published") {
    const { enqueueMatchJob } = await import("@/modules/matching/service");
    await enqueueMatchJob(job.id);
  }
  if (job.status === "closed") {
    const recipientIds = await listActiveCandidateIds(job.id);
    await safeNotify("job.closed", recipientIds, {
      jobId: job.id,
      jobTitle: job.title,
    });
  }
  return job;
}
