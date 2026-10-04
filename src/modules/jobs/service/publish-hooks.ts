/**
 * A job that becomes (or stays) published after a write is queued for the
 * matching recompute (10.1, D161). The repo writes stay as they were.
 */
import { enqueueMatchingForJob } from "@/modules/matching/service";
import { updateJob as updateInRepo } from "../repo/jobs-repo";
import { republishImportedJob as republishInRepo } from "../repo/admin-jobs-repo";

export async function updateJob(
  ...args: Parameters<typeof updateInRepo>
): Promise<Awaited<ReturnType<typeof updateInRepo>>> {
  const job = await updateInRepo(...args);
  if (job.status === "published") await enqueueMatchingForJob(job.id);
  return job;
}

export async function republishImportedJob(
  ...args: Parameters<typeof republishInRepo>
): Promise<Awaited<ReturnType<typeof republishInRepo>>> {
  const result = await republishInRepo(...args);
  if (result?.to === "published") await enqueueMatchingForJob(args[0]);
  return result;
}
