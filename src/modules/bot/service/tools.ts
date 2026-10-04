import { createHash } from "node:crypto";
import { z } from "zod";
import { HttpError } from "@/lib/http";
import {
  JOB_LLM_FIELDS,
  PROFILE_LLM_FIELDS,
  pickLlmFields,
  wrapUntrusted,
  type LLMToolDefinition,
} from "@/lib/llm";
import {
  applyToJob,
  listOwnApplications,
} from "@/modules/applications/service";
import {
  candidatePatchInput,
  getOwnCandidate,
  patchCandidateProfile,
} from "@/modules/candidates/service";
import { hideJobInput } from "@/modules/feedback/schemas";
import {
  getHiddenSetsForViewer,
  hideJobForUser,
  saveJobForUser,
} from "@/modules/feedback/service";
import { getJobForPublic, searchJobs } from "@/modules/jobs/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";

/**
 * Tool layer of 12.3 (D173): the only way from the model to data. Every
 * call is checked again here — who may call it (P11) and whether a write
 * carries a server-issued confirmation (P8) — whatever the model says.
 */

export type BotState = {
  /** Guest profile draft (12.2); a user's draft is saved only on confirm. */
  draft?: Record<string, unknown>;
};

export type ToolContext = {
  userId: string | null;
  conversationId: string;
  locale: string;
  state: BotState;
};

/** What the model reads back, and an optional card for the chat UI. */
export type ToolOutcome = {
  llm: string;
  client?: { kind: string; data: unknown };
  state?: BotState;
};

type Access = "guest" | "user";

type BotTool<T extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: T;
  /** `guest`: anyone; `user`: a signed-in user only. */
  access: Access;
  /** True when the call writes for a signed-in user (needs a confirmation). */
  confirm: (ctx: ToolContext) => boolean;
  run: (ctx: ToolContext, input: z.infer<T>) => Promise<ToolOutcome>;
};

const id = z.uuid();
const MAX_JOBS = 5;

function tool<T extends z.ZodType>(definition: BotTool<T>): BotTool {
  return definition as unknown as BotTool;
}

const never = () => false;

function jobForLlm(job: {
  id: string;
  title: string;
  company: { name: string };
}) {
  const fields = pickLlmFields(job, JOB_LLM_FIELDS);
  return wrapUntrusted(`job:${job.id}`, JSON.stringify(fields));
}

function jobCard(job: {
  id: string;
  title: string;
  company: { name: string };
  workFormat: string;
}) {
  return {
    id: job.id,
    title: job.title,
    companyName: job.company.name,
    workFormat: job.workFormat,
  };
}

const searchInput = z
  .object({
    q: z.string().trim().max(200).optional(),
    category: jobSearchQuery.shape.category,
    workFormat: z.enum(["remote", "hybrid", "onsite"]).optional(),
    employmentType: z.enum(["full_time", "part_time", "contract"]).optional(),
    limit: z.number().int().min(1).max(MAX_JOBS).optional(),
  })
  .strict();

export const TOOLS: readonly BotTool[] = [
  tool({
    name: "search_jobs",
    description:
      "Search published jobs. Returns up to 5 jobs; descriptions are not included.",
    input: searchInput,
    access: "guest",
    confirm: never,
    async run(ctx, input) {
      const query = jobSearchQuery.parse({
        q: input.q,
        category: input.category,
        workFormat: input.workFormat,
        employmentType: input.employmentType,
        limit: input.limit ?? MAX_JOBS,
      });
      const hidden = ctx.userId
        ? await getHiddenSetsForViewer(ctx.userId)
        : null;
      const { items } = await searchJobs(query, ctx.locale, { hidden });
      const jobs = items.slice(0, MAX_JOBS);
      return {
        llm: jobs.length ? jobs.map(jobForLlm).join("\n") : "No jobs found.",
        client: { kind: "jobs", data: jobs.map(jobCard) },
      };
    },
  }),
  tool({
    name: "get_job",
    description: "Read one published job with its description.",
    input: z.object({ id }).strict(),
    access: "guest",
    confirm: never,
    async run(ctx, input) {
      const job = await getJobForPublic(input.id, {
        userId: ctx.userId ?? undefined,
        locale: ctx.locale,
      });
      if (!job) return { llm: "Job not found." };
      return {
        llm: [
          jobForLlm(job),
          wrapUntrusted(`job:${job.id}`, job.description),
        ].join("\n"),
        client: { kind: "jobs", data: [jobCard(job)] },
      };
    },
  }),
  tool({
    name: "get_my_profile",
    description: "Read the user's own profile (no contacts).",
    input: z.object({}).strict(),
    access: "user",
    confirm: never,
    async run(ctx) {
      const profile = await getOwnCandidate(ctx.userId!);
      if (!profile) return { llm: "The user has no profile yet." };
      return {
        llm: JSON.stringify(
          pickLlmFields(
            {
              ...profile,
              categories: profile.preferences.categories,
              skills: profile.skills.map((skill) => ({
                slug: skill.slug,
                level: skill.level,
                years: skill.years,
              })),
            },
            PROFILE_LLM_FIELDS,
          ),
        ),
      };
    },
  }),
  tool({
    name: "propose_profile_update",
    description:
      "Propose profile changes. A guest's changes stay in the draft; a user confirms them on a card before anything is saved.",
    input: candidatePatchInput,
    access: "guest",
    confirm: (ctx) => ctx.userId !== null,
    async run(ctx, input) {
      if (!ctx.userId) {
        const draft = { ...ctx.state.draft, ...input };
        return {
          llm: "The draft profile was updated.",
          client: { kind: "draft", data: draft },
          state: { ...ctx.state, draft },
        };
      }
      await patchCandidateProfile(ctx.userId, input);
      return {
        llm: "The profile was saved.",
        client: { kind: "profile_saved", data: null },
      };
    },
  }),
  tool({
    name: "save_job",
    description: "Save a job to the user's list.",
    input: z.object({ jobId: id }).strict(),
    access: "user",
    confirm: never,
    async run(ctx, input) {
      await saveJobForUser(ctx.userId!, input.jobId);
      return {
        llm: "The job was saved.",
        client: { kind: "saved", data: input.jobId },
      };
    },
  }),
  tool({
    name: "hide_job",
    description: "Hide a job or its company from the user's results.",
    input: z.object({ jobId: id }).extend(hideJobInput.shape).strict(),
    access: "user",
    confirm: never,
    async run(ctx, input) {
      await hideJobForUser(ctx.userId!, input.jobId, {
        scope: input.scope,
        reason: input.reason,
      });
      return {
        llm: "The job was hidden.",
        client: { kind: "hidden", data: input.jobId },
      };
    },
  }),
  tool({
    name: "apply_to_job",
    description:
      "Apply to an internal job. The user confirms on a card first. Imported jobs cannot be applied to here; give the link instead.",
    input: z
      .object({
        jobId: id,
        coverNote: z.string().trim().max(2000).optional(),
      })
      .strict(),
    access: "user",
    confirm: () => true,
    async run(ctx, input) {
      const application = await applyToJob(ctx.userId!, {
        jobId: input.jobId,
        coverNote: input.coverNote ?? null,
      });
      return {
        llm: `Applied. Application status: ${application.status}.`,
        client: { kind: "applied", data: { jobId: input.jobId } },
      };
    },
  }),
  tool({
    name: "get_my_applications",
    description: "List the user's applications with their status.",
    input: z.object({}).strict(),
    access: "user",
    confirm: never,
    async run(ctx) {
      const applications = await listOwnApplications(ctx.userId!);
      return {
        llm: applications.length
          ? applications
              .map((a) =>
                wrapUntrusted(
                  `job:${a.jobId}`,
                  JSON.stringify({ job: a.jobTitle, status: a.status }),
                ),
              )
              .join("\n")
          : "No applications yet.",
      };
    },
  }),
];

/** Tools offered to the model: guests never even see user tools (P11). */
export function toolsFor(userId: string | null): LLMToolDefinition[] {
  return TOOLS.filter((t) => userId !== null || t.access === "guest").map(
    (t) => ({ name: t.name, description: t.description, input: t.input }),
  );
}

export function findTool(name: string): BotTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

/** Stable hash of tool arguments, so a confirmation fits only these args. */
export function hashArgs(tool: string, args: unknown): string {
  const canonical = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map((key) => [
            key,
            canonical((value as Record<string, unknown>)[key]),
          ]),
      );
    }
    return value;
  };
  return createHash("sha256")
    .update(JSON.stringify([tool, canonical(args)]))
    .digest("hex");
}

export type Confirmed = { tool: string; argsHash: string; userId: string };

export function toolNeedsConfirmation(ctx: ToolContext, name: string) {
  return findTool(name)?.confirm(ctx) ?? false;
}

/**
 * Runs one tool call. Unknown tool or bad args: 400. A guest on a user
 * tool: 403 BOT_TOOL_FORBIDDEN (P11). A write without a matching
 * confirmation: 422 CONFIRMATION_REQUIRED (P8).
 */
export async function runTool(
  ctx: ToolContext,
  name: string,
  rawInput: unknown,
  confirmed?: Confirmed,
): Promise<ToolOutcome> {
  const definition = findTool(name);
  if (!definition) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unknown tool ${name}`);
  }
  if (definition.access === "user" && !ctx.userId) {
    throw new HttpError(403, "FORBIDDEN", "Sign in to do this");
  }
  const parsed = definition.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", `Invalid input for ${name}`);
  }
  if (definition.confirm(ctx)) {
    const valid =
      confirmed !== undefined &&
      confirmed.tool === name &&
      confirmed.userId === ctx.userId &&
      confirmed.argsHash === hashArgs(name, parsed.data);
    if (!valid) {
      throw new HttpError(
        422,
        "CONFIRMATION_REQUIRED",
        "This action needs the user's confirmation",
      );
    }
  }
  return definition.run(ctx, parsed.data);
}
