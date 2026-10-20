import { createHash } from "node:crypto";
import { z } from "zod";
import { EVENT_KINDS, EVENT_TOPICS } from "@/config/events";
import { EMPLOYMENT_TYPES } from "@/config/markers";
import { HttpError } from "@/lib/http";
import {
  JOB_LLM_FIELDS,
  PROFILE_LLM_FIELDS,
  pickLlmFields,
  wrapUntrusted,
  type LLMToolDefinition,
} from "@/lib/llm";
import { botMessageBucket, rateRules, windowCount } from "@/lib/rate-limit";
import {
  applyToJob,
  listOwnApplications,
} from "@/modules/applications/service";
import { billingMe } from "@/modules/billing/service";
import {
  candidatePatchInput,
  getOwnCandidate,
  patchCandidateProfile,
} from "@/modules/candidates/service";
import { findEventsForPerson, getEventBySlug } from "@/modules/events/service";
import { isValidTimeZone } from "@/lib/tz";
import { hideJobInput } from "@/modules/feedback/schemas";
import {
  getHiddenSetsForViewer,
  hideJobForUser,
  saveJobForUser,
} from "@/modules/feedback/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import {
  demandSummary,
  getJobForPublic,
  publishedDemand,
  queueTeamJobBrief,
  searchJobs,
} from "@/modules/jobs/service";
import { SKILL_CATEGORIES } from "@/modules/taxonomy/service";
import {
  SHOW_THRESHOLD,
  listMatchPage,
  topExplain,
} from "@/modules/matching/service";
import { freelanceTools } from "@/modules/freelance/service";
import { ugcTools } from "@/modules/ugc/service";
import { jobDraftTools } from "./job-tools";
import { OFFER_ACTIONS, offerPath } from "./offers";
import { searchFiltersFromDraft, eventPlaceFromDraft } from "./memory";
import { accountTools } from "./account-tools";
import { employerJobTools } from "./employer-job-tools";
import { accountProfileTools } from "./account-profile-tool";
import { myCardsTools } from "./my-cards-tool";
import { pitchTools, screenCoverNote } from "./pitch";
import { reminderTools } from "./reminders";
import {
  findEventsFace,
  getCompanyFace,
  getJobFace,
  listJobCategoriesFace,
  searchJobsFace,
  type McpFace,
  type McpOutcome,
} from "./mcp-faces";
import { formatStanding, standingMissing } from "./standing";
import {
  MEMORY_MAX_CHARS,
  MEMORY_MAX_FACTS,
  factRef,
  forgetFactByRef,
  rememberFact,
} from "./user-memory";

/**
 * Tool layer of 12.3 (D173): the only way from the model to data. Every
 * call is checked again here — who may call it (P11) and whether a write
 * carries a server-issued confirmation (P8) — whatever the model says.
 */

export type FillMode = "self" | "spoki";

export type BotState = {
  /** Allowlisted profile fields gathered in the conversation (12.2, D324). */
  draft?: Record<string, unknown>;
  /** Preferences that are not columns on the candidate profile. */
  notes?: string;
  /** Set when a guest conversation is attached and its draft can be saved. */
  needsDraftOffer?: boolean;
  /** How a signed-in person wants the profile filled. */
  fillMode?: FillMode | null;
  /** The guest has already been offered an account once. */
  signupHintShown?: boolean;
  /** Claimed guest thread still needs one continuation message. */
  resumeAckPending?: boolean;
  /** Continuation was shown; the fill choice stays until they pick. */
  resumeAckShown?: boolean;
  /** The vacancy this turn is asking about. */
  presentedJobId?: string;
  /** Vacancies the person already passed. Short list, no new table. */
  passedJobIds?: string[];
  /** Whether the shown vacancy suits them. A yes is not an application. */
  verdict?: "suits" | "declined";
  /** Opened from Services (D423), creative tests (D457) or a freelance service or order (D460). */
  topic?: "services" | "ugc" | "freelance";
  /** Freelance service this thread was opened for (`/chat?service=`). Not a write. */
  freelanceServiceId?: string;
  /** Own freelance order this thread was opened for (`/chat?order=`). */
  freelanceOrderId?: string;
  /** Service title for the prompt. Untrusted text. */
  freelanceTitle?: string;
  /** Creative test this Telegram chat is focused on. Not a write. */
  ugcCampaignId?: string;
  /** Product name for the prompt. Untrusted text. */
  ugcProduct?: string;
  /** The UGC next step last offered in this thread (D467). */
  ugcNextKey?: string;
  /** The general thread is collecting a new UGC brief (D492). */
  ugcDraftMode?: boolean;
  ugcDraftId?: string;
  /** The general thread is collecting a job listing (D494). */
  jobDraftMode?: boolean;
  jobDraftId?: string;
  /** The general thread is collecting a freelance service listing (D493). */
  freelanceDraftMode?: boolean;
  freelanceDraftId?: string;
  lastUserText?: string;
};

export type ToolContext = {
  userId: string | null;
  conversationId: string;
  locale: string;
  state: BotState;
  /** The matching site confirmation card was accepted. */
  confirmedAction?: boolean;
};

/** What the model reads back, and an optional card for the chat UI. */
export type ToolOutcome = {
  llm: string;
  client?: { kind: string; data: unknown };
  state?: BotState;
};

type Access = "guest" | "user";

export type BotTool<T extends z.ZodType = z.ZodType> = {
  name: string;
  description: string;
  input: T;
  /** `guest`: anyone; `user`: a signed-in user only. */
  access: Access;
  /** True when the call writes for a signed-in user (needs a confirmation). */
  confirm: (ctx: ToolContext) => boolean;
  /**
   * Fields the person types into the confirmation card (links, a result
   * URL). They reach `run` after the card, never the model or the hash.
   */
  cardFields?: readonly string[];
  /**
   * Names the target for the card from the database (a job title, a search
   * name). Throws 404 when it is not this person's, so no card is shown.
   */
  preview?: (ctx: ToolContext, input: z.infer<T>) => Promise<string>;
  run: (
    ctx: ToolContext,
    input: z.infer<T>,
    card?: Record<string, unknown>,
  ) => Promise<ToolOutcome>;
  /** False for a tool that only outside assistants get over MCP (D486). */
  spoki?: false;
  /** What the tool shows over MCP; absent means the tool is not on MCP (D486). */
  mcp?: McpFace<z.infer<T>>;
};

const id = z.uuid();
const MAX_JOBS = 5;
const EVENT_DESCRIPTION_CHARS = 1000;

/** "2026-11-03 09:00" in the given IANA zone. */
function localTime(at: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

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
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
    limit: z.number().int().min(1).max(MAX_JOBS).optional(),
  })
  .strict();

const MAX_EVENTS = 5;

const eventsInput = z
  .object({
    topics: z.array(z.enum(EVENT_TOPICS)).max(5).optional(),
    kind: z.enum(EVENT_KINDS).optional(),
    country: z
      .string()
      .regex(/^[A-Z]{2}$/)
      .optional(),
    remote: z.boolean().optional(),
    limit: z.number().int().min(1).max(MAX_EVENTS).optional(),
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
    mcp: searchJobsFace,
    async run(ctx, input) {
      const remembered = searchFiltersFromDraft(ctx.state.draft);
      const query = jobSearchQuery.parse({
        q: input.q ?? remembered.q,
        category: input.category,
        workFormat: input.workFormat ?? remembered.workFormat,
        employmentType: input.employmentType,
        country: remembered.country,
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
    mcp: getJobFace,
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
    name: "published_demand",
    description:
      "Count published jobs by category, highest first. Use when they ask what work is in demand. Do not invent counts.",
    input: z.object({}).strict(),
    access: "guest",
    confirm: never,
    async run() {
      return { llm: demandSummary(await publishedDemand()) };
    },
  }),
  tool({
    name: "find_events",
    description:
      "Find upcoming Web3 and tech events (summits, conferences, meetups, hackathons, business and career meetups) for networking. Read-only. Topics, kind, country (ISO 3166-1 alpha-2) and remote are optional; without them the person's known country and remote preference are used. Returns up to 5 events with their slug; for one in full call get_event. Then call offer_step with events instead of writing a URL.",
    input: eventsInput,
    access: "guest",
    confirm: never,
    mcp: findEventsFace,
    async run(ctx, input) {
      const known = eventPlaceFromDraft(ctx.state.draft);
      const events = await findEventsForPerson({
        topics: input.topics,
        kind: input.kind,
        country: input.country ?? known.country,
        remote: input.remote ?? known.remote,
        limit: input.limit ?? MAX_EVENTS,
      });
      if (!events.length) return { llm: "No upcoming events found." };
      return {
        llm: events
          .slice(0, MAX_EVENTS)
          .map((event) =>
            wrapUntrusted(
              `event:${event.slug}`,
              JSON.stringify({
                slug: event.slug,
                title: event.title,
                kind: event.kind,
                format: event.format,
                starts: event.startsAt.toISOString().slice(0, 10),
                ends: event.endsAt.toISOString().slice(0, 10),
                city: event.city,
                country: event.country,
                topics: event.topics,
              }),
            ),
          )
          .join("\n"),
      };
    },
  }),
  tool({
    name: "get_event",
    description:
      "One event in full by its slug from find_events: what it is about, when (also in the person's own time zone when known), where, format, topics and the call-for-papers deadline. Read-only. There is no sign-up on this site.",
    input: z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }).strict(),
    access: "guest",
    confirm: never,
    async run(ctx, input) {
      const event = await getEventBySlug(input.slug);
      if (!event || event.status !== "published")
        return {
          llm: "This event is not on the site: it has passed or was removed.",
        };
      const zone = ctx.state.draft?.timezone;
      const own =
        typeof zone === "string" && isValidTimeZone(zone) ? zone : null;
      return {
        llm: wrapUntrusted(
          `event:${event.slug}`,
          JSON.stringify({
            slug: event.slug,
            title: event.title,
            kind: event.kind,
            format: event.format,
            description: event.description.slice(0, EVENT_DESCRIPTION_CHARS),
            starts: event.startsAt.toISOString(),
            ends: event.endsAt.toISOString(),
            allDay: event.allDay,
            eventTimeZone: event.timeZone,
            startsInYourTime:
              own && !event.allDay ? localTime(event.startsAt, own) : null,
            yourTimeZone: own,
            city: event.city,
            country: event.country,
            topics: event.topics,
            callForPapersUntil: event.cfpEndsAt
              ? event.cfpEndsAt.toISOString().slice(0, 10)
              : null,
            source: event.source.name,
          }),
        ),
      };
    },
  }),
  tool({
    name: "offer_step",
    description:
      "Show one card that opens a page on this site: pay_hire, pay_team, pay_plus, pay_pro, pricing, register, post_job, order_service, events, freelance (the freelance catalog), freelance_sell (the seller cabinet), freelance_payout (a freelancer confirms the payout address), memory (what Spoki remembers, in settings), account_settings (email, password, sign-in methods, deleting the account) or my_account (the about-me profile and all roles). Use this instead of writing a URL. After you have helped, call it for the paid plan that fits. Use pricing when the plan is not clear yet. Use order_service only after they ask to order a managed team or leave the task. Do not use it to answer a question about a service.",
    input: z.object({ action: z.enum(OFFER_ACTIONS) }).strict(),
    access: "guest",
    confirm: never,
    async run(ctx, input) {
      const href = offerPath(input.action, ctx.userId !== null);
      if (!href) {
        return { llm: "That step is not available for this person." };
      }
      return {
        llm: `A card is on screen for ${input.action}. Do not repeat the address.`,
        client: { kind: "offer", data: { action: input.action } },
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
    name: "get_my_standing",
    description:
      "Read this person's candidate plan, employer plan, messages left today, and profile gaps. No contacts. Use when they ask if a plan is on, how many messages remain, or what the profile still lacks.",
    input: z.object({}).strict(),
    access: "user",
    confirm: never,
    async run(ctx) {
      const billing = await billingMe(ctx.userId!);
      const bucket = botMessageBucket(billing.candidatePlan);
      const used = await windowCount(bucket, ctx.userId!);
      const profile = await getOwnCandidate(ctx.userId!);
      return {
        llm: formatStanding({
          candidatePlan: billing.candidatePlan,
          employerPlan: billing.plan,
          limit: rateRules[bucket].limit,
          used,
          missing: standingMissing(profile?.missing ?? []),
          hasProfile: profile !== null,
        }),
      };
    },
  }),
  tool({
    name: "propose_profile_update",
    description:
      "Propose profile changes. A guest's changes stay in the draft. A signed-in user confirms them on a card, unless they asked Spoki to fill the profile.",
    input: candidatePatchInput,
    access: "guest",
    confirm: (ctx) => ctx.userId !== null && ctx.state.fillMode !== "spoki",
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
      "Apply to an internal job. Call get_pitch_facts first and pass coverNote: the candidate's letter to the employer, first person, 3 to 5 sentences, only from those facts and MEMORY (D475). The candidate reads it on the card and confirms. Imported jobs cannot be applied to here; give the link instead.",
    input: z
      .object({
        jobId: id,
        coverNote: z.string().trim().max(2000).optional(),
      })
      .strict(),
    access: "user",
    confirm: () => true,
    async preview(ctx, input) {
      screenCoverNote(input.coverNote);
      const job = await getJobForPublic(input.jobId, { locale: ctx.locale });
      if (!job) throw new HttpError(404, "NOT_FOUND", "Not found");
      return job.title;
    },
    async run(ctx, input) {
      const application = await applyToJob(ctx.userId!, {
        jobId: input.jobId,
        coverNote: screenCoverNote(input.coverNote),
      });
      return {
        llm: `Applied. Application status: ${application.status}.`,
        client: {
          kind: "applied",
          data: { jobId: input.jobId, status: application.status },
        },
      };
    },
  }),
  tool({
    name: "get_matches",
    description:
      "List the signed-in user's matching jobs, best first. Only jobs at or above the show threshold are returned, with a short explanation.",
    input: z.object({}).strict(),
    access: "user",
    confirm: never,
    async run(ctx) {
      const page = await listMatchPage(ctx.userId!, {
        limit: MAX_JOBS,
        locale: ctx.locale,
      });
      const items = page.items.filter((item) => item.score >= SHOW_THRESHOLD);
      if (page.lowData || items.length === 0) {
        return {
          llm: page.lowData
            ? "The user has no profile yet, so there are no matches."
            : "No jobs are at or above the match threshold.",
        };
      }
      return {
        llm: items
          .map((item) =>
            wrapUntrusted(
              `job:${item.job.id}`,
              JSON.stringify({
                title: item.job.title,
                company: item.job.company.name,
                score: item.score,
                explain: topExplain(item.explain).map(
                  (entry) => entry.detail.key,
                ),
              }),
            ),
          )
          .join("\n"),
        client: {
          kind: "matches",
          data: items.map((item) => ({
            id: item.job.id,
            title: item.job.title,
            companyName: item.job.company.name,
            workFormat: item.job.workFormat,
            score: item.score,
            explain: topExplain(item.explain),
          })),
        },
      };
    },
  }),
  tool({
    name: "propose_team_job",
    description:
      "Queue a job from a role and hiring criteria. Only when Employer plan is team. The user confirms on a card. The job waits for an admin and is not on the public list yet. Do not use this to search for candidates.",
    input: z
      .object({
        title: z.string().trim().min(3).max(140),
        criteria: z.string().trim().min(50).max(20000),
        category: z.enum(SKILL_CATEGORIES),
        employmentType: z.enum(EMPLOYMENT_TYPES),
        skills: z.array(z.string().trim().min(1).max(80)).max(12).optional(),
      })
      .strict(),
    access: "user",
    confirm: () => true,
    async run(ctx, input) {
      const result = await queueTeamJobBrief(ctx.userId!, input);
      if (!result.posted && result.reason === "plan") {
        return {
          llm: "Not posted. Employer plan is not team. Call offer_step with pay_team or post_job. Do not say the job was posted.",
          client: { kind: "job_refused", data: { reason: "plan" } },
        };
      }
      if (!result.posted) {
        return {
          llm: "Not posted. There is no company this person can post for. Call offer_step with post_job. Do not say the job was posted.",
          client: { kind: "job_refused", data: { reason: "company" } },
        };
      }
      return {
        llm: `Queued for review. Title: ${result.title}. Status: ${result.status}. It is not on the public list until an admin approves it.`,
        client: {
          kind: "job_queued",
          data: { title: result.title, status: result.status },
        },
      };
    },
  }),
  tool({
    name: "get_my_applications",
    description:
      "List the user's applications with their status and applicationId (for withdraw_application).",
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
                  JSON.stringify({
                    applicationId: a.id,
                    job: a.jobTitle,
                    status: a.status,
                  }),
                ),
              )
              .join("\n")
          : "No applications yet.",
      };
    },
  }),
  tool({
    name: "remember_fact",
    description:
      "Keep one short fact about this person in Spoki memory, in their words: a goal, a preference, a situation (D469). Call it when they ask you to remember something, or tell you a lasting fact about themselves that is not already in KNOWN PROFILE or MEMORY. Never contacts, links, documents, passwords, keys or other people's data. Say in the same reply what you kept.",
    input: z
      .object({ fact: z.string().trim().min(1).max(MEMORY_MAX_CHARS) })
      .strict(),
    access: "user",
    confirm: never,
    async run(ctx, input) {
      const result = await rememberFact(ctx.userId!, input.fact, "chat");
      if (!result.ok) {
        return {
          llm:
            result.reason === "full"
              ? `Not kept: memory already holds ${MEMORY_MAX_FACTS} facts. They can erase some in settings.`
              : result.reason === "contacts" || result.reason === "secret"
                ? "Not kept: contacts and secrets are never stored. Say so in one sentence."
                : "Not kept: the fact was empty or too long.",
        };
      }
      return {
        llm: result.duplicate
          ? "Already in memory."
          : `Kept in memory as [${factRef(result.fact.id)}]. Tell them they can see and erase it in settings.`,
        client: { kind: "offer", data: { action: "memory" } },
      };
    },
  }),
  tool({
    name: "forget_fact",
    description:
      "Erase one fact from Spoki memory by the reference in brackets from MEMORY. Call it when they ask you to forget it or say it is no longer true.",
    input: z
      .object({
        ref: z
          .string()
          .trim()
          .regex(/^[0-9a-f]{8}$/i),
      })
      .strict(),
    access: "user",
    confirm: never,
    async run(ctx, input) {
      const gone = await forgetFactByRef(ctx.userId!, input.ref);
      return {
        llm: gone
          ? "Erased from memory."
          : "No fact with that reference. Nothing was erased.",
      };
    },
  }),
  tool({
    name: "list_job_categories",
    description: listJobCategoriesFace.description,
    input: z.object({}).strict(),
    access: "guest",
    confirm: never,
    spoki: false,
    mcp: listJobCategoriesFace,
    async run() {
      return { llm: (await listJobCategoriesFace.run({})).text };
    },
  }),
  tool({
    name: "get_company",
    description: getCompanyFace.description,
    input: z
      .object({
        slug: z
          .string()
          .trim()
          .regex(/^[a-z0-9-]{1,80}$/),
      })
      .strict(),
    access: "guest",
    confirm: never,
    spoki: false,
    mcp: getCompanyFace,
    async run(_ctx, input) {
      return { llm: (await getCompanyFace.run(input)).text };
    },
  }),
  ...accountTools,
  ...employerJobTools,
  ...accountProfileTools,
  ...myCardsTools,
  ...pitchTools,
  ...reminderTools,
  ...(ugcTools as unknown as BotTool[]),
  ...(freelanceTools as unknown as BotTool[]),
  ...jobDraftTools,
];

/** Tools Spoki has; MCP-only tools are not among them (D486). */
const SPOKI_TOOLS = TOOLS.filter((t) => t.spoki !== false);

/** Tools offered to the model: guests never even see user tools (P11). */
export function toolsFor(
  userId: string | null,
  state?: BotState,
): LLMToolDefinition[] {
  return SPOKI_TOOLS.filter((t) => userId !== null || t.access === "guest")
    .filter((t) => {
      if (state?.ugcDraftMode)
        return userId === null
          ? t.name === "offer_step"
          : ["patch_brief", "confirm_brief", "reset_draft"].includes(t.name);
      if (state?.freelanceDraftMode)
        return userId === null
          ? t.name === "offer_step"
          : [
              "patch_service_draft",
              "confirm_service_draft",
              "reset_service_draft",
            ].includes(t.name);
      if (state?.jobDraftMode)
        return userId === null
          ? t.name === "offer_step"
          : [
              "patch_job_draft",
              "confirm_job_draft",
              "reset_job_draft",
            ].includes(t.name);
      if (state?.topic === "ugc")
        return (
          (t.name.includes("ugc") ||
            t.name.includes("creator_profile") ||
            t.name === "offer_step") &&
          ![
            "patch_brief",
            "confirm_brief",
            "reset_draft",
            "propose_ugc_campaign",
          ].includes(t.name)
        );
      return true;
    })
    .map((t) => ({ name: t.name, description: t.description, input: t.input }));
}

export function findTool(name: string): BotTool | undefined {
  return SPOKI_TOOLS.find((t) => t.name === name);
}

/**
 * The MCP face of the registry (D486): only guest reads with a face.
 * The gate is checked here once more, so a write or a user tool never
 * reaches MCP even if it got a face by mistake.
 */
function isMcpReadTool(t: BotTool): boolean {
  const ctx: ToolContext = {
    userId: null,
    conversationId: "mcp",
    locale: "en",
    state: {},
  };
  // A card for anyone (guest or user) marks a write: never on MCP.
  return (
    t.mcp !== undefined &&
    t.access === "guest" &&
    !t.confirm(ctx) &&
    !t.confirm({ ...ctx, userId: "mcp" })
  );
}

const MCP_TOOLS = TOOLS.filter(isMcpReadTool);

export type McpToolDefinition = {
  name: string;
  title: string;
  description: string;
  input: z.ZodType;
};

/** MCP tools in registry order, so `tools/list` is always the same. */
export function mcpTools(): McpToolDefinition[] {
  return MCP_TOOLS.map((t) => ({
    name: t.name,
    title: t.mcp!.title,
    description: t.mcp!.description,
    input: t.input,
  }));
}

/** Runs one MCP call. Unknown or non-MCP tool: 400. Bad args: 400. */
export async function runMcpTool(
  name: string,
  rawInput: unknown,
): Promise<McpOutcome> {
  const definition = MCP_TOOLS.find((t) => t.name === name);
  if (!definition) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unknown tool ${name}`);
  }
  const parsed = definition.input.safeParse(rawInput ?? {});
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", `Invalid input for ${name}`);
  }
  return definition.mcp!.run(parsed.data);
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

/** What the card names (D472), or null when the tool has no preview. */
export async function toolPreview(
  ctx: ToolContext,
  name: string,
  rawInput: unknown,
): Promise<string | null> {
  const definition = findTool(name);
  if (!definition?.preview) return null;
  const parsed = definition.input.safeParse(rawInput);
  if (!parsed.success) {
    throw new HttpError(400, "VALIDATION_ERROR", `Invalid input for ${name}`);
  }
  return definition.preview(ctx, parsed.data);
}

/** Names of the fields the card collects for this tool; empty for most. */
export function toolCardFields(name: string): readonly string[] {
  return findTool(name)?.cardFields ?? [];
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
  card?: Record<string, unknown>,
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
  let confirmedAction = false;
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
    confirmedAction = true;
  }
  // Card fields only after a valid confirmation, and only the tool's own.
  const allowed = definition.cardFields ?? [];
  const fields =
    confirmed && card && allowed.length
      ? Object.fromEntries(
          Object.entries(card).filter(([key]) => allowed.includes(key)),
        )
      : undefined;
  return definition.run({ ...ctx, confirmedAction }, parsed.data, fields);
}
