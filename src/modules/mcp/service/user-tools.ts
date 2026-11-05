import { z } from "zod";
import { listOwnApplications } from "@/modules/applications/service";
import { getOwnCandidate } from "@/modules/candidates/service";
import { listSavedJobsForUser } from "@/modules/feedback/service";
import { listFollows } from "@/modules/follows/service";
import { listOrders, listOwnServices } from "@/modules/freelance/service";
import { getMatches } from "@/modules/matching/service";
import { listSavedSearches } from "@/modules/saved-searches/service";
import { listMcpReminders } from "@/modules/bot/service";
import { listMyCampaignSummaries, listMyInvites } from "@/modules/ugc/service";
import { forbidden, validationError } from "@/lib/http";
import type { McpPrincipal, McpScope } from "./auth-service";

export type UserMcpTool = {
  name: string;
  title: string;
  description: string;
  scope: McpScope;
  input: z.ZodType;
  run: (userId: string) => Promise<Record<string, unknown>>;
};

const USER_TOOLS: UserMcpTool[] = [
  {
    name: "get_my_standing",
    title: "Read my profile progress",
    description:
      "Read your candidate profile completeness and the profile fields still missing.",
    scope: "profile:read",
    input: z.object({}).strict(),
    async run(userId) {
      const profile = await getOwnCandidate(userId);
      if (!profile) return { available: false, reason: "no_profile" };
      return {
        available: true,
        completeness: profile.completeness,
        missing: profile.missing,
      };
    },
  },
  {
    name: "get_my_profile",
    title: "Read my profile",
    description:
      "Read your own candidate profile and skills. Contact details are never included.",
    scope: "profile:read",
    input: z.object({}).strict(),
    async run(userId) {
      const profile = await getOwnCandidate(userId);
      if (!profile) return { available: false, reason: "no_profile" };
      return {
        available: true,
        profile: {
          fullName: profile.fullName,
          headline: profile.headline,
          desiredTitles: profile.desiredTitles,
          country: profile.country,
          city: profile.city,
          timezone: profile.timezone,
          workFormats: profile.workFormats,
          employmentTypes: profile.employmentTypes,
          experienceYears: profile.experienceYears,
          salaryMin: profile.salaryMin,
          salaryMax: profile.salaryMax,
          summary: profile.summary,
          jobSearchStatus: profile.jobSearchStatus,
          completeness: profile.completeness,
          missing: profile.missing,
          skills: profile.skills.map(({ slug, level, years }) => ({
            slug,
            level,
            years,
          })),
          languages: profile.languages,
          preferences: profile.preferences,
        },
      };
    },
  },
  {
    name: "get_my_applications",
    title: "Read my applications",
    description: "List your own job applications with status and job title.",
    scope: "applications:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { applications: await listOwnApplications(userId) };
    },
  },
  {
    name: "get_my_matches",
    title: "Read my job matches",
    description:
      "Read your job matches and fit scores. The existing matcher may refresh its private cache.",
    scope: "profile:read",
    input: z.object({}).strict(),
    async run(userId) {
      const result = await getMatches(userId);
      return { lowData: result.lowData, matches: result.items };
    },
  },
  {
    name: "get_my_saved_jobs",
    title: "Read my saved jobs",
    description: "List your saved public jobs and links.",
    scope: "saved:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { jobs: await listSavedJobsForUser(userId, 50) };
    },
  },
  {
    name: "get_my_saved_searches",
    title: "Read my saved searches",
    description: "List your saved job searches and alert settings.",
    scope: "saved:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { searches: await listSavedSearches(userId) };
    },
  },
  {
    name: "get_my_follows",
    title: "Read my followed companies",
    description: "List companies you follow and their alert settings.",
    scope: "saved:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { follows: await listFollows(userId) };
    },
  },
  {
    name: "list_my_reminders",
    title: "Read my reminders",
    description: "List your pending reminders with their time zones.",
    scope: "reminders:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { reminders: await listMcpReminders(userId) };
    },
  },
  {
    name: "get_my_ugc_campaigns",
    title: "Read my UGC campaigns",
    description:
      "List UGC campaigns belonging to your companies with status and progress.",
    scope: "ugc:read",
    input: z.object({}).strict(),
    async run(userId) {
      return { campaigns: await listMyCampaignSummaries(userId) };
    },
  },
  {
    name: "get_ugc_summary",
    title: "Read my UGC activity",
    description:
      "Read UGC campaigns for your companies and invitations addressed to you.",
    scope: "ugc:read",
    input: z.object({}).strict(),
    async run(userId) {
      const [campaigns, invites] = await Promise.all([
        listMyCampaignSummaries(userId),
        listMyInvites(userId),
      ]);
      return { campaigns, invites };
    },
  },
  {
    name: "get_my_services",
    title: "Read my freelance services",
    description: "List your own freelance service listings and their status.",
    scope: "freelance:read",
    input: z.object({}).strict(),
    async run(userId) {
      const services = await listOwnServices(userId);
      return {
        services: services.map((service) => ({
          id: service.id,
          title: service.title,
          status: service.status,
          url: `/freelance/services/${service.slug}`,
        })),
      };
    },
  },
  {
    name: "list_my_freelance_orders",
    title: "List my freelance orders",
    description:
      "List your own freelance orders. No other party contact details are returned.",
    scope: "freelance:read",
    input: z.object({}).strict(),
    async run(userId) {
      const [buyer, seller] = await Promise.all([
        listOrders(userId, "buyer"),
        listOrders(userId, "seller"),
      ]);
      const rows = [...(buyer ?? []), ...(seller ?? [])];
      return {
        orders: rows.map((order) => ({
          id: order.id,
          side: order.side,
          serviceTitle: order.serviceTitle,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          priceMinor: order.priceMinor.toString(),
          url: `/freelance/orders/${order.id}`,
        })),
      };
    },
  },
];

export function userMcpTools(principal: McpPrincipal): UserMcpTool[] {
  return USER_TOOLS.filter((tool) => principal.scopes.includes(tool.scope));
}

export async function runUserMcpTool(
  name: string,
  input: unknown,
  principal: McpPrincipal,
) {
  const tool = USER_TOOLS.find((candidate) => candidate.name === name);
  if (!tool || !principal.scopes.includes(tool.scope)) throw forbidden();
  const parsed = tool.input.safeParse(input ?? {});
  if (!parsed.success) {
    throw validationError();
  }
  return tool.run(principal.userId);
}
