import { z } from "zod";
import { isExplicitYes } from "@/lib/explicit-yes";
import { EMPLOYMENT_TYPES } from "@/config/markers";
import { HttpError } from "@/lib/http";
import { cleanForModel } from "@/modules/freelance/service";
import {
  confirmJobDraft,
  jobDraftForModel,
  patchJobDraft,
  resetJobDraft,
} from "@/modules/jobs/service";
import { SKILL_CATEGORIES } from "@/modules/taxonomy/service";
import type { BotTool } from "./tools";

type Context = {
  userId: string | null;
  state: {
    jobDraftMode?: boolean;
    jobDraftId?: string;
    lastUserText?: string;
  };
  confirmedAction?: boolean;
};

const read = () => false;
const write = () => true;
const draftFields = z
  .object({
    companyName: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.enum(SKILL_CATEGORIES).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    location: z.string().optional(),
    salaryMin: z.string().optional(),
    salaryMax: z.string().optional(),
    salaryCurrency: z.string().optional(),
    salaryPeriod: z.enum(["month", "year"]).optional(),
    countries: z.array(z.string()).optional(),
    applicationMethod: z.enum(["internal", "email", "external_url"]).optional(),
  })
  .strict();

function model(value: unknown) {
  return cleanForModel(JSON.stringify(value));
}

/** A clear yes to submitting the job, before its card (D520). */
export function isExplicitJobDraftConfirmation(text: string): boolean {
  return isExplicitYes(text, ["отправляй", "подавай", "запускай", "submit"]);
}

function explicitReset(text: string) {
  return /(?:начать заново|сброси(?:ть)? черновик|очисти черновик|новая вакансия|другая вакансия|start over|reset the draft|new job|different job)/i.test(
    text,
  );
}

function assertDraftMode(ctx: Context) {
  if (!ctx.state.jobDraftMode)
    throw new HttpError(
      409,
      "JOB_DRAFT_THREAD_REQUIRED",
      "Open the job listing draft first",
    );
}

export const jobDraftTools = [
  {
    name: "patch_job_draft",
    description:
      "Save only job listing fields clearly present in the latest user message. Omit absent values. A salary range is an explicit lower and upper value. Do not collect personal contacts or names; these are entered in the review form. The card with the link to the review form shows by itself once the chat fields are complete; set showCard=true (an empty patch is fine) only when the person asks for the link or the card.",
    input: z
      .object({ patch: draftFields, showCard: z.boolean().optional() })
      .strict(),
    access: "user",
    confirm: read,
    async run(
      ctx: Context,
      input: { patch: Record<string, unknown>; showCard?: boolean },
    ) {
      assertDraftMode(ctx);
      const result = await patchJobDraft(ctx.userId, {
        draftId: ctx.state.jobDraftId,
        patch: input.patch,
      });
      return {
        llm: model({
          draft: jobDraftForModel(result.draft),
          missingRequired: result.missingRequired,
          formMissingRequired: result.formMissingRequired,
        }),
        state: { ...ctx.state, jobDraftId: result.id },
        client: {
          kind: "job_draft",
          data: { ...result, showCard: input.showCard === true },
        },
      };
    },
  },
  {
    name: "confirm_job_draft",
    description:
      "Request the site's final confirmation card to submit the complete shared job draft. Call only after the user's latest message clearly says yes to submitting this vacancy.",
    input: z.object({}).strict(),
    access: "user",
    confirm: write,
    requiresExplicitYes: isExplicitJobDraftConfirmation,
    async run(ctx: Context) {
      assertDraftMode(ctx);
      if (
        !ctx.confirmedAction &&
        !isExplicitJobDraftConfirmation(ctx.state.lastUserText ?? "")
      )
        throw new HttpError(
          409,
          "JOB_EXPLICIT_CONFIRMATION_REQUIRED",
          "Wait for a clear yes to submit this listing",
        );
      const result = await confirmJobDraft(
        ctx.userId,
        ctx.state.jobDraftId ?? "",
      );
      if (!result.submitted)
        return {
          llm: "The job is not submitted. The private company contact and application details still need to be completed in the review form. Open the job draft card and finish those fields.",
          client: { kind: "job_draft", data: { ...result, showCard: true } },
        };
      return {
        llm: model({
          submitted: true,
          title: result.title,
          status: result.status,
        }),
        state: { ...ctx.state, jobDraftMode: false, jobDraftId: undefined },
        audit: { entityType: "job", entityId: String(result.jobId) },
        client: {
          kind: "job_draft_submitted",
          data: {
            id: result.jobId,
            title: result.title,
            status: result.status,
          },
        },
      };
    },
  },
  {
    name: "reset_job_draft",
    description:
      "Start a clean job listing draft only when the user explicitly asks to reset or replace this vacancy.",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    journal: true,
    async run(ctx: Context) {
      assertDraftMode(ctx);
      if (!explicitReset(ctx.state.lastUserText ?? ""))
        throw new HttpError(
          409,
          "JOB_EXPLICIT_RESET_REQUIRED",
          "Wait for a clear request to reset the job draft",
        );
      const result = await resetJobDraft(ctx.userId, ctx.state.jobDraftId);
      return {
        llm: "The job listing draft was cleared. No previous field was carried over.",
        state: { ...ctx.state, jobDraftId: result.id },
        client: { kind: "job_draft", data: result },
      };
    },
  },
] as unknown as BotTool[];
