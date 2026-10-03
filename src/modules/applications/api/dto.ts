import type { ApplicationStatus } from "../service/transitions";

/** Fields a candidate may see on their own application. */
export type ApplicationDto = {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  coverNote: string | null;
  reapplyCount: number;
  createdAt: string;
};

export const APPLICATION_DTO_KEYS = [
  "id",
  "jobId",
  "jobTitle",
  "status",
  "coverNote",
  "reapplyCount",
  "createdAt",
] as const;

export function toApplicationDto(row: {
  id: string;
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  coverNote: string | null;
  reapplyCount: number;
  createdAt: Date;
}): ApplicationDto {
  return {
    id: row.id,
    jobId: row.jobId,
    jobTitle: row.jobTitle,
    status: row.status,
    coverNote: row.coverNote,
    reapplyCount: row.reapplyCount,
    createdAt: row.createdAt.toISOString(),
  };
}
