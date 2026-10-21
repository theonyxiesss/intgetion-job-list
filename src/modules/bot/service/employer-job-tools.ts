import { z } from "zod";
import { EMPLOYMENT_TYPES } from "@/config/markers";
import { HttpError, unauthenticated } from "@/lib/http";
import { requireMembership } from "@/lib/auth-guards";
import { wrapUntrusted } from "@/lib/llm";
import { countByStatusForJob } from "@/modules/applications/service";
import { requireActiveUserById } from "@/modules/auth/service";
import {
  findMemberRole,
  findOwnedJob,
  JOB_TRANSITIONS,
  listJobsForUser,
  transitionOwnedJob,
  updateJob,
} from "@/modules/jobs/service";
import { patchJobInput } from "@/modules/jobs/schemas";
import type { JobStatus } from "@/modules/jobs/service";
import type { BotTool, ToolContext } from "./tools";

/**
 * An employer's own vacancies in Spoki (D498): the same reads and the same
 * actions as the employer cabinet, under the same role check. Every change
 * waits for the confirmation card; "delete" is close, as in the cabinet.
 */

const id = z.uuid();
const write = () => true;
const read = () => false;
const RECRUITER_ROLES = ["owner", "admin", "recruiter"] as const;
const EDITABLE = new Set([
  "draft",
  "paused",
  "pending_moderation",
  "published",
]);
const MAX_LISTED = 20;
const DESCRIPTION_CHARS = 1500;

/** What Spoki may change; the rest stays in the cabinet form. */
const jobUpdateFields = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    workFormat: z.enum(["remote", "hybrid", "onsite"]).optional(),
    location: z.string().optional(),
    salaryMin: z.string().optional(),
    salaryMax: z.string().optional(),
    salaryCurrency: z.string().optional(),
    salaryPeriod: z.enum(["hour", "month", "year"]).optional(),
    salaryBasis: z.enum(["gross", "net"]).optional(),
  })
  .strict();

const STATUS_ACTIONS = {
  publish: "publish",
  pause: "pause",
  resume: "extend",
  close: "close",
} as const;

function tool<T extends z.ZodType>(definition: BotTool<T>): BotTool {
  return definition as unknown as BotTool;
}

function user(ctx: ToolContext): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

/** Owned and the person may manage it, or 404/403 before any card. */
async function managedJob(ctx: ToolContext, jobId: string) {
  const userId = user(ctx);
  const job = await findOwnedJob(jobId, userId);
  await requireMembership(
    job.companyId,
    RECRUITER_ROLES,
    findMemberRole,
    async () => requireActiveUserById(userId),
  );
  return job;
}

function total(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}

function day(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

/** Fields whose site rules depend on each other (location, salary set). */
const LINKED_FIELDS = [
  "workFormat",
  "location",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "salaryPeriod",
  "salaryBasis",
  "experienceMin",
  "experienceMax",
] as const;

/**
 * Only the keys the model sent, checked by the site rules against the
 * vacancy as it is now: a new salary keeps the saved currency, hybrid keeps
 * the saved location. The site schema fills defaults (remote, empty skills)
 * for absent keys; passing those on would rewrite fields nobody named.
 */
export function namedJobPatch(
  input: Record<string, unknown>,
  current: Record<string, unknown> = {},
) {
  const named = Object.keys(input).filter((key) => input[key] !== undefined);
  const base = Object.fromEntries(
    LINKED_FIELDS.filter((key) => current[key] != null).map((key) => [
      key,
      current[key],
    ]),
  );
  const result = patchJobInput.safeParse({ ...base, ...input });
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      `Ask the person for these fields: ${problems.join("; ")}`,
    );
  }
  const parsed = result.data as Record<string, unknown>;
  return Object.fromEntries(named.map((key) => [key, parsed[key]]));
}

export const employerJobTools: BotTool[] = [
  tool({
    name: "get_my_jobs",
    description:
      "List the vacancies of the person's own companies (as employer) with id, title, status, dates and the number of applications. Use when they ask about their vacancies, their postings or how their job is doing.",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    async run(ctx) {
      const rows = (await listJobsForUser(user(ctx))).slice(0, MAX_LISTED);
      if (!rows.length)
        return {
          llm: "No vacancies of their own. To publish one, offer the job draft with offer_step post_job.",
        };
      const jobs = await Promise.all(
        rows.map(async ({ job, company }) => ({
          id: job.id,
          title: job.title,
          company: company.name,
          status: job.status,
          publishedAt: day(job.publishedAt),
          expiresAt: day(job.expiresAt),
          applications: total(await countByStatusForJob(job.id)),
          link: `/jobs/${job.id}`,
        })),
      );
      return { llm: wrapUntrusted("user_message", JSON.stringify(jobs)) };
    },
  }),
  tool({
    name: "get_my_job",
    description:
      "One of the person's own vacancies in full, by id from get_my_jobs: text, pay, format, status, dates and applications by status.",
    input: z.object({ jobId: id }).strict(),
    access: "user",
    confirm: read,
    async run(ctx, input) {
      const job = await findOwnedJob(input.jobId, user(ctx));
      const card = {
        id: job.id,
        title: job.title,
        company: job.company.name,
        status: job.status,
        description: job.description.slice(0, DESCRIPTION_CHARS),
        employmentType: job.employmentType,
        workFormat: job.workFormat,
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        salaryPeriod: job.salaryPeriod,
        publishedAt: day(job.publishedAt),
        expiresAt: day(job.expiresAt),
        applications: await countByStatusForJob(job.id),
        link: `/jobs/${job.id}`,
      };
      return { llm: wrapUntrusted(`job:${job.id}`, JSON.stringify(card)) };
    },
  }),
  tool({
    name: "propose_job_update",
    description:
      "Change one of the person's own vacancies by id from get_my_jobs. Send only the fields they asked to change. Salary is in minor units (cents) as a digit string, with salaryCurrency (ISO, e.g. USD), salaryPeriod and salaryBasis. Confirmed on a card. Other fields (skills, contacts, countries) stay in the cabinet form.",
    input: jobUpdateFields.extend({ jobId: id }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      const { jobId, ...fields } = input;
      if (!Object.keys(fields).length)
        throw new HttpError(422, "VALIDATION_ERROR", "Name what to change");
      const job = await managedJob(ctx, jobId);
      if (!EDITABLE.has(job.status))
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          `The vacancy is ${job.status}; it cannot be edited`,
        );
      namedJobPatch(fields, job);
      return job.title;
    },
    async run(ctx, input) {
      const { jobId, ...fields } = input;
      const job = await managedJob(ctx, jobId);
      if (!EDITABLE.has(job.status))
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          "This job cannot be edited in its current state",
        );
      const owner = await requireActiveUserById(user(ctx));
      if (!owner) throw unauthenticated();
      const updated = await updateJob(
        jobId,
        namedJobPatch(fields, job) as Parameters<typeof updateJob>[1],
        owner,
        null,
      );
      return {
        llm: `Vacancy updated. Status: ${updated.status}. Link: /jobs/${updated.id}.`,
      };
    },
  }),
  tool({
    name: "set_job_status",
    description:
      "Change the status of one of the person's own vacancies by id from get_my_jobs: publish a draft, pause, resume a paused or expired one, or close it. A request to delete or remove a vacancy is close: it leaves the site and search and stays in the cabinet as closed. Confirmed on a card.",
    input: z
      .object({
        jobId: id,
        action: z.enum(["publish", "pause", "resume", "close"]),
      })
      .strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      const job = await managedJob(ctx, input.jobId);
      // A change the status refuses gets no card (D515).
      const action = STATUS_ACTIONS[input.action];
      if (!JOB_TRANSITIONS[action][job.status as JobStatus])
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          `The vacancy is ${job.status}; ${input.action} is not possible`,
        );
      return job.title;
    },
    async run(ctx, input) {
      await managedJob(ctx, input.jobId);
      const job = await transitionOwnedJob(
        input.jobId,
        STATUS_ACTIONS[input.action],
        user(ctx),
      );
      return { llm: `Vacancy status: ${job.status}. Link: /jobs/${job.id}.` };
    },
  }),
];
