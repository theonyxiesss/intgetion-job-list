import { z } from "zod";
import { ACCOUNT_PLANS, ONE_OFFS } from "@/config/pricing";
import { HttpError, unauthenticated } from "@/lib/http";
import { wrapUntrusted } from "@/lib/llm";
import {
  APPLICATION_STATUSES,
  employerPatchTargets,
  listEmployerApplications,
  patchApplicationStatus,
} from "@/modules/applications/service";
import { billingMe } from "@/modules/billing/service";
import { listNotifications } from "@/modules/notifications/service";
import { getSalaryOverview } from "@/modules/salaries/service";
import type { BotTool, ToolContext } from "./tools";

/**
 * Services the chat home reaches only through Spoki (TZ 53): salaries,
 * plans, the notification feed and an employer's candidates. Reads are
 * plain; moving a candidate waits for the confirmation card, as in the
 * employer cabinet.
 */

const never = () => false;
const write = () => true;
const MAX_SKILLS = 8;
const MAX_NOTIFICATIONS = 10;
const MAX_APPLICANTS = 50;

function tool<T extends z.ZodType>(definition: BotTool<T>): BotTool {
  return definition as unknown as BotTool;
}

function user(ctx: ToolContext): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

/** The candidate's application on one of the person's vacancies, or 404. */
async function employerApplication(
  ctx: ToolContext,
  jobId: string,
  applicationId: string,
) {
  const page = await listEmployerApplications(user(ctx), {
    jobId,
    limit: MAX_APPLICANTS,
  });
  const found = page.items.find((item) => item.id === applicationId);
  if (!found) throw new HttpError(404, "NOT_FOUND", "No such application");
  return found;
}

export const platformTools: BotTool[] = [
  tool({
    name: "get_salaries",
    description:
      "Salary ranges on this platform by skill, from published jobs: median and the middle half in US dollars a year, also by seniority. Read-only. Pass skills (names or slugs, e.g. React, Python) to narrow it; without them the best-covered skills come back. Say these are platform figures from a limited number of jobs, and never invent a number that is not here.",
    input: z
      .object({ skills: z.array(z.string().min(1).max(60)).max(5).optional() })
      .strict(),
    access: "guest",
    confirm: never,
    async run(_ctx, input) {
      const overview = await getSalaryOverview();
      const wanted = (input.skills ?? []).map((skill) => skill.toLowerCase());
      const rows = wanted.length
        ? overview.filter(({ skill }) =>
            wanted.some(
              (name) =>
                skill.slug === name ||
                skill.nameEn.toLowerCase() === name ||
                skill.nameRu.toLowerCase() === name,
            ),
          )
        : [...overview].sort((a, b) => b.stats.jobCount - a.stats.jobCount);
      if (!rows.length) return { llm: "No salary data for those skills yet." };
      return {
        llm: JSON.stringify(
          rows.slice(0, MAX_SKILLS).map(({ skill, stats }) => ({
            skill: skill.nameEn,
            jobs: stats.jobCount,
            usdPerYear: {
              p25: stats.p25,
              median: stats.median,
              p75: stats.p75,
            },
            bySeniority: stats.bySeniority.map((row) => ({
              seniority: row.seniority,
              median: row.median,
              jobs: row.jobCount,
            })),
          })),
        ),
      };
    },
  }),
  tool({
    name: "get_plans",
    description:
      "The platform's plans and prices in US dollars (free, Plus, Pro, Team) and one-off paid options, plus the person's own active plan when signed in. Read-only. To buy, call offer_step with pricing; there is no payment inside this chat.",
    input: z.object({}).strict(),
    access: "guest",
    confirm: never,
    async run(ctx) {
      const own = ctx.userId ? await billingMe(ctx.userId) : null;
      return {
        llm: JSON.stringify({
          plans: ACCOUNT_PLANS.map((plan) => ({
            code: plan.code,
            usdPerMonth: plan.price,
            usdPerYear: plan.yearly ?? null,
            includes: plan.points,
          })),
          oneOffs: ONE_OFFS.filter((item) => item.live).map((item) => ({
            code: item.code,
            usd: item.price,
          })),
          yours: own,
        }),
      };
    },
  }),
  tool({
    name: "get_my_notifications",
    description:
      "The person's latest notifications on the site (application status, new messages, matches) and how many are unread. Read-only; they stay unread. Summarize the newest few in plain words.",
    input: z.object({}).strict(),
    access: "user",
    confirm: never,
    async run(ctx) {
      const feed = await listNotifications(user(ctx), {
        limit: MAX_NOTIFICATIONS,
      });
      return {
        llm: wrapUntrusted(
          "user_message",
          JSON.stringify({
            unread: feed.unreadCount,
            items: feed.items.map((item) => ({
              type: item.type,
              unread: item.readAt === null,
              at: item.createdAt.slice(0, 16),
              payload: item.payload,
            })),
          }),
        ),
      };
    },
  }),
  tool({
    name: "get_job_applicants",
    description:
      "Candidates who applied to one of the person's own vacancies, by job id from get_my_jobs: name, status, cover note and the statuses they can be moved to. Read-only. Only for a member of the hiring company.",
    input: z
      .object({
        jobId: z.uuid(),
        status: z.enum(APPLICATION_STATUSES).optional(),
      })
      .strict(),
    access: "user",
    confirm: never,
    async run(ctx, input) {
      const page = await listEmployerApplications(user(ctx), {
        jobId: input.jobId,
        status: input.status,
        limit: MAX_APPLICANTS,
      });
      if (!page.items.length) return { llm: "No applications yet." };
      return {
        llm: wrapUntrusted(
          "user_message",
          JSON.stringify(
            page.items.map((item) => ({
              applicationId: item.id,
              candidate: item.candidateName,
              status: item.status,
              coverNote: item.coverNote?.slice(0, 600) ?? null,
              applied: item.createdAt.slice(0, 10),
              canMoveTo: employerPatchTargets(item.status),
            })),
          ),
        ),
      };
    },
  }),
  tool({
    name: "set_application_status",
    description:
      "Move a candidate's application on the person's own vacancy to the next status (interview, offer, hired, or rejected), by jobId and applicationId from get_job_applicants. Only a status listed in canMoveTo. Putting someone on the short list opens their contacts and stays in the employer cabinet. The candidate is told. Confirmed on a card.",
    input: z
      .object({
        jobId: z.uuid(),
        applicationId: z.uuid(),
        status: z.enum(APPLICATION_STATUSES),
      })
      .strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      const found = await employerApplication(
        ctx,
        input.jobId,
        input.applicationId,
      );
      // A move the status machine refuses gets no card (D515).
      if (!employerPatchTargets(found.status).includes(input.status))
        throw new HttpError(
          409,
          "INVALID_TRANSITION",
          `The application is ${found.status}; ${input.status} is not possible`,
        );
      return `${found.candidateName ?? "—"} · ${found.jobTitle}`;
    },
    async run(ctx, input) {
      await employerApplication(ctx, input.jobId, input.applicationId);
      const updated = await patchApplicationStatus(
        user(ctx),
        input.applicationId,
        input.status,
      );
      return { llm: `Application status: ${updated.status}.` };
    },
  }),
];
