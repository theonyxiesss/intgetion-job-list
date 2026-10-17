import { z } from "zod";
import { wrapUntrusted } from "@/lib/llm";
import {
  getOwnApplication,
  withdrawOwnApplication,
} from "@/modules/applications/service";
import {
  getOwnCandidate,
  ownAgentBriefsEnabled,
  setOwnAgentBriefsEnabled,
  setProfileHidden,
} from "@/modules/candidates/service";
import {
  listSavedJobsForUser,
  unsaveJobForUser,
} from "@/modules/feedback/service";
import {
  followCompany,
  listFollows,
  unfollowCompany,
} from "@/modules/follows/service";
import { getVisibleCompany } from "@/modules/jobs/service";
import { jobSearchQuery } from "@/modules/jobs/schemas/search";
import {
  catalogTitleKey,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
  readPreferences,
  writePreferences,
} from "@/modules/notifications/service";
import {
  deleteSavedSearch,
  listSavedSearches,
  saveSearch,
  setSearchAlert,
} from "@/modules/saved-searches/service";
import { HttpError, notFound } from "@/lib/http";
import { EMPLOYMENT_TYPES } from "@/config/markers";
import type { BotTool, ToolContext } from "./tools";

/**
 * Spoki changes what a person can change on the site themselves (D472).
 * Reads go straight through; every write waits for the confirmation card,
 * and `preview` names the target from the database before the card is shown,
 * so a card never offers someone else's application, search or job. The
 * module services check ownership again when the card is accepted.
 */

const id = z.uuid();
const write = () => true;
const read = () => false;
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{0,99}$/);

function tool<T extends z.ZodType>(definition: BotTool<T>): BotTool {
  return definition as unknown as BotTool;
}

function user(ctx: ToolContext): string {
  return ctx.userId!;
}

async function ownSearch(userId: string, searchId: string) {
  const found = (await listSavedSearches(userId)).find(
    (search) => search.id === searchId,
  );
  if (!found) throw notFound();
  return found;
}

async function ownSavedJob(userId: string, jobId: string) {
  const found = (await listSavedJobsForUser(userId)).find(
    (entry) => entry.job.id === jobId,
  );
  if (!found) throw notFound();
  return found.job;
}

async function visibleCompany(companySlug: string) {
  const company = await getVisibleCompany(companySlug);
  if (!company) throw notFound();
  return company;
}

const searchFilters = z
  .object({
    name: z.string().trim().min(1).max(80),
    q: z.string().trim().max(200).optional(),
    category: jobSearchQuery.shape.category,
    workFormat: z.enum(["remote", "hybrid", "onsite"]).optional(),
    employmentType: z.enum(EMPLOYMENT_TYPES).optional(),
  })
  .strict();

function searchQuery(input: z.infer<typeof searchFilters>): string {
  const params = new URLSearchParams();
  if (input.q) params.set("q", input.q);
  if (input.category) params.set("category", input.category);
  if (input.workFormat) params.set("workFormat", input.workFormat);
  if (input.employmentType) params.set("employmentType", input.employmentType);
  return params.toString();
}

const notificationInput = z
  .object({
    type: z.enum(NOTIFICATION_TYPES),
    channel: z.enum(NOTIFICATION_CHANNELS),
    enabled: z.boolean(),
  })
  .strict();

export const accountTools: BotTool[] = [
  tool({
    name: "get_my_saved_jobs",
    description: "List the jobs this person saved, with job ids.",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    async run(ctx) {
      const saved = await listSavedJobsForUser(user(ctx), 30);
      return {
        llm: saved.length
          ? saved
              .map(({ job }) =>
                wrapUntrusted(
                  `job:${job.id}`,
                  JSON.stringify({
                    jobId: job.id,
                    title: job.title,
                    company: job.company.name,
                  }),
                ),
              )
              .join("\n")
          : "No saved jobs.",
      };
    },
  }),
  tool({
    name: "unsave_job",
    description:
      "Remove one job from this person's saved list. Confirmed on a card.",
    input: z.object({ jobId: id }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      return (await ownSavedJob(user(ctx), input.jobId)).title;
    },
    async run(ctx, input) {
      await unsaveJobForUser(user(ctx), input.jobId);
      return { llm: "Removed from saved jobs." };
    },
  }),
  tool({
    name: "withdraw_application",
    description:
      "Withdraw one of this person's applications by its id from get_my_applications. Confirmed on a card. The company is told.",
    input: z.object({ applicationId: id }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      return (await getOwnApplication(user(ctx), input.applicationId)).jobTitle;
    },
    async run(ctx, input) {
      const application = await withdrawOwnApplication(
        user(ctx),
        input.applicationId,
      );
      return { llm: `Application status: ${application.status}.` };
    },
  }),
  tool({
    name: "get_my_saved_searches",
    description:
      "List this person's saved searches with ids, filters and whether the daily alert is on.",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    async run(ctx) {
      const searches = await listSavedSearches(user(ctx));
      return {
        llm: searches.length
          ? wrapUntrusted(
              "user_message",
              JSON.stringify(
                searches.map((search) => ({
                  id: search.id,
                  name: search.name,
                  filters: search.query,
                  alert: search.alert,
                })),
              ),
            )
          : "No saved searches.",
      };
    },
  }),
  tool({
    name: "save_search",
    description:
      "Save a job search with a short name and its filters, so the person can reopen it and get a daily alert. Confirmed on a card.",
    input: searchFilters,
    access: "user",
    confirm: write,
    async preview(_ctx, input) {
      if (!searchQuery(input)) {
        throw new HttpError(422, "VALIDATION_ERROR", "Nothing to save");
      }
      return input.name;
    },
    async run(ctx, input) {
      const saved = await saveSearch(user(ctx), {
        name: input.name,
        query: searchQuery(input),
      });
      return { llm: `Search saved. Its id is ${saved.id}.` };
    },
  }),
  tool({
    name: "delete_saved_search",
    description: "Delete one saved search by id. Confirmed on a card.",
    input: z.object({ searchId: id }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      return (await ownSearch(user(ctx), input.searchId)).name;
    },
    async run(ctx, input) {
      await deleteSavedSearch(input.searchId, user(ctx));
      return { llm: "Saved search deleted." };
    },
  }),
  tool({
    name: "set_search_alert",
    description:
      "Turn the daily new-jobs alert of one saved search on or off. Confirmed on a card.",
    input: z.object({ searchId: id, alert: z.boolean() }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx, input) {
      return (await ownSearch(user(ctx), input.searchId)).name;
    },
    async run(ctx, input) {
      await setSearchAlert(input.searchId, user(ctx), input.alert);
      return { llm: input.alert ? "Alert on." : "Alert off." };
    },
  }),
  tool({
    name: "get_my_follows",
    description:
      "List the companies this person follows, with their slugs. Following sends new jobs of that company.",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    async run(ctx) {
      const follows = await listFollows(user(ctx));
      return {
        llm: follows.length
          ? follows
              .map((follow) =>
                wrapUntrusted(
                  `company:${follow.companyId}`,
                  JSON.stringify({
                    slug: follow.companySlug,
                    name: follow.companyName,
                  }),
                ),
              )
              .join("\n")
          : "Follows no companies.",
      };
    },
  }),
  tool({
    name: "follow_company",
    description:
      "Follow a company by its slug (from a job or get_my_follows), to get its new jobs. Confirmed on a card.",
    input: z.object({ slug }).strict(),
    access: "user",
    confirm: write,
    async preview(_ctx, input) {
      return (await visibleCompany(input.slug)).name;
    },
    async run(ctx, input) {
      await followCompany(user(ctx), input.slug);
      return { llm: "Following." };
    },
  }),
  tool({
    name: "unfollow_company",
    description: "Stop following a company by its slug. Confirmed on a card.",
    input: z.object({ slug }).strict(),
    access: "user",
    confirm: write,
    async preview(_ctx, input) {
      return (await visibleCompany(input.slug)).name;
    },
    async run(ctx, input) {
      await unfollowCompany(user(ctx), input.slug);
      return { llm: "Not following any more." };
    },
  }),
  tool({
    name: "get_my_settings",
    description:
      "Read this person's account settings: whether the profile is hidden from employers, whether morning briefs are on, and which notifications are on per channel (inapp, email, telegram).",
    input: z.object({}).strict(),
    access: "user",
    confirm: read,
    async run(ctx) {
      const [profile, briefs, preferences] = await Promise.all([
        getOwnCandidate(user(ctx)),
        ownAgentBriefsEnabled(user(ctx)),
        readPreferences(user(ctx)),
      ]);
      const off = preferences
        .filter((item) => !item.enabled)
        .map((item) => `${item.type}/${item.channel}`);
      return {
        llm: JSON.stringify({
          hasProfile: profile !== null,
          profileHidden: profile?.isHidden ?? null,
          morningBriefs: briefs,
          notificationsOff: off,
        }),
      };
    },
  }),
  tool({
    name: "set_notification",
    description:
      "Turn one notification type on or off for one channel (inapp, email, telegram). Confirmed on a card.",
    input: notificationInput,
    access: "user",
    confirm: write,
    async preview(_ctx, input) {
      // The card turns this key into the localized notification title.
      return catalogTitleKey(input.type) ?? input.type;
    },
    async run(ctx, input) {
      await writePreferences(user(ctx), [input]);
      return { llm: input.enabled ? "Notification on." : "Notification off." };
    },
  }),
  tool({
    name: "set_profile_hidden",
    description:
      "Hide the candidate profile from employers, or show it again. Confirmed on a card.",
    input: z.object({ hidden: z.boolean() }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx) {
      if (!(await getOwnCandidate(user(ctx)))) throw notFound();
      return "";
    },
    async run(ctx, input) {
      await setProfileHidden(user(ctx), input.hidden);
      return { llm: input.hidden ? "Profile hidden." : "Profile visible." };
    },
  }),
  tool({
    name: "set_morning_briefs",
    description: "Turn the morning job briefs on or off. Confirmed on a card.",
    input: z.object({ enabled: z.boolean() }).strict(),
    access: "user",
    confirm: write,
    async preview(ctx) {
      if (!(await getOwnCandidate(user(ctx)))) throw notFound();
      return "";
    },
    async run(ctx, input) {
      await setOwnAgentBriefsEnabled(user(ctx), input.enabled);
      return {
        llm: input.enabled ? "Morning briefs on." : "Morning briefs off.",
      };
    },
  }),
];
