import { z } from "zod";
import { unauthenticated } from "@/lib/http";
import { wrapUntrusted } from "@/lib/llm";
import { logger } from "@/lib/logger";
import { listOwnApplications } from "@/modules/applications/service";
import { billingMe } from "@/modules/billing/service";
import { listSavedJobsForUser } from "@/modules/feedback/service";
import { listOrders, listOwnServices } from "@/modules/freelance/service";
import { listJobsForUser } from "@/modules/jobs/service";
import { listSavedSearches } from "@/modules/saved-searches/service";
import { listMyCampaigns, listMyInvites } from "@/modules/ugc/service";
import * as reminders from "../repo/reminder-repo";
import type { BotTool, ToolContext } from "./tools";

/**
 * "What do I have on the site?" in one read (D510, 29.6): counts, statuses
 * and the latest few of each kind of card, with site links. Each group is
 * read on its own; one failing group is reported, not the whole answer.
 * Details stay with the get_my_* reads; nothing here writes.
 */

const LATEST = 5;

type Item = { title: string; status?: string; link?: string };
type Group = {
  count: number;
  byStatus?: Record<string, number>;
  latest: Item[];
};

function byStatus(items: readonly { status?: string }[]) {
  const out: Record<string, number> = {};
  for (const item of items)
    if (item.status) out[item.status] = (out[item.status] ?? 0) + 1;
  return out;
}

function group(items: Item[]): Group {
  const counts = byStatus(items);
  return {
    count: items.length,
    ...(Object.keys(counts).length ? { byStatus: counts } : {}),
    latest: items.slice(0, LATEST),
  };
}

async function safe(name: string, read: () => Promise<Group>) {
  try {
    return await read();
  } catch (error) {
    logger.warn({ err: error, group: name }, "bot: my cards group failed");
    return { error: "not read now" } as const;
  }
}

function user(ctx: ToolContext): string {
  if (!ctx.userId) throw unauthenticated();
  return ctx.userId;
}

const tool = {
  name: "get_my_cards",
  description:
    "One overview of everything the person has on the site: vacancies they publish, applications, saved jobs and searches, UGC briefs they order, creator participations, freelance services, orders as buyer and seller, reminders and the plan. Counts, statuses and the latest few with links. Use when they ask what they have, what is going on, or for their account at a glance; then go to the matching get_my_* read for details.",
  input: z.object({}).strict(),
  access: "user",
  confirm: () => false,
  async run(ctx: ToolContext) {
    const id = user(ctx);
    const [
      vacancies,
      applications,
      savedJobs,
      savedSearches,
      briefs,
      creatorWork,
      services,
      ordersAsBuyer,
      ordersAsSeller,
      pending,
      plan,
    ] = await Promise.all([
      safe("vacancies", async () =>
        group(
          (await listJobsForUser(id)).map(({ job }) => ({
            title: job.title,
            status: job.status,
            link: `/jobs/${job.id}`,
          })),
        ),
      ),
      safe("applications", async () =>
        group(
          (await listOwnApplications(id)).map((row) => ({
            title: row.jobTitle,
            status: row.status,
            link: `/jobs/${row.jobId}`,
          })),
        ),
      ),
      safe("savedJobs", async () =>
        group(
          (await listSavedJobsForUser(id, 50)).map((row) => ({
            title: row.job.title,
            link: `/jobs/${row.job.id}`,
          })),
        ),
      ),
      safe("savedSearches", async () =>
        group(
          (await listSavedSearches(id)).map((row) => ({ title: row.name })),
        ),
      ),
      safe("ugcBriefs", async () =>
        group(
          (await listMyCampaigns(id)).map((row) => ({
            title: row.productName,
            status: row.status,
            link: `/campaigns/${row.id}`,
          })),
        ),
      ),
      safe("creatorParticipations", async () =>
        group(
          (await listMyInvites(id)).map((row) => ({
            title: row.productName,
            status: row.status,
          })),
        ),
      ),
      safe("freelanceServices", async () =>
        group(
          (await listOwnServices(id)).map((row) => ({
            title: row.title,
            status: row.status,
            link: "/profile/freelance",
          })),
        ),
      ),
      safe("ordersAsBuyer", async () =>
        group(
          (await listOrders(id, "buyer")).map((row) => ({
            title: row.serviceTitle,
            status: row.status,
            link: `/freelance/orders/${row.id}`,
          })),
        ),
      ),
      safe("ordersAsSeller", async () =>
        group(
          (await listOrders(id, "seller")).map((row) => ({
            title: row.serviceTitle,
            status: row.status,
            link: `/freelance/orders/${row.id}`,
          })),
        ),
      ),
      safe("reminders", async () =>
        group(
          (await reminders.listPending(id)).map((row) => ({
            title: `${row.text} (${row.remind_at})`,
          })),
        ),
      ),
      billingMe(id)
        .then((billing) => ({
          candidatePlan: billing.candidatePlan,
          employerPlan: billing.plan,
        }))
        .catch(() => ({ error: "not read now" }) as const),
    ]);
    return {
      llm: wrapUntrusted(
        "user_message",
        JSON.stringify({
          plan,
          vacancies,
          applications,
          savedJobs,
          savedSearches,
          ugcBriefs: briefs,
          creatorParticipations: creatorWork,
          freelanceServices: services,
          ordersAsBuyer,
          ordersAsSeller,
          reminders: pending,
          account: "/account",
        }),
      ),
    };
  },
};

export const myCardsTools = [tool as unknown as BotTool];
