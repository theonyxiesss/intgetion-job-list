import { z } from "zod";
import { APPLICATION_STATUSES } from "../service/transitions";

export const createApplicationInput = z
  .object({
    jobId: z.uuid(),
    coverNote: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();

export type CreateApplicationInput = z.infer<typeof createApplicationInput>;

export const listApplicationsQuery = z
  .object({
    as: z.enum(["candidate", "employer"]).optional(),
  })
  .strict();

export const patchApplicationStatusInput = z
  .object({
    to: z.enum(APPLICATION_STATUSES),
  })
  .strict();

export type PatchApplicationStatusInput = z.infer<
  typeof patchApplicationStatusInput
>;
