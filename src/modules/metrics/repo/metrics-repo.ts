import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  applications,
  jobs,
  matchingResults,
  notificationEmails,
  users,
} from "@/db/schema";

export type MetricsSnapshot = {
  registrations: {
    total: number;
    last7d: number;
    byRole: { candidates: number; employers: number };
  };
  jobs: {
    published: number;
    internal: number;
    imported: number;
  };
  applications: {
    last24h: number;
    last7d: number;
    mutualInterest: number; // shortlisted
  };
  moderation: {
    queueSize: number;
    byStatus: { pending: number; approved: number; rejected: number };
  };
  emails: {
    byStatus: {
      pending: number;
      sent: number;
      skipped: number;
      failed: number;
    };
    byType: Record<string, number>;
  };
  matching?: {
    avgScore: number | null;
    totalPairs: number;
    thresholdPairs: number; // score >= 0.55
  };
};

async function countTable(
  table:
    | typeof users
    | typeof jobs
    | typeof applications
    | typeof notificationEmails,
  column:
    | typeof users.createdAt
    | typeof jobs.createdAt
    | typeof applications.createdAt
    | typeof notificationEmails.createdAt,
  since?: Date,
  extra?: ReturnType<typeof eq> | ReturnType<typeof and>,
): Promise<number> {
  const where = since
    ? extra
      ? and(gte(column, since), extra)
      : gte(column, since)
    : extra;
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)` })
    .from(table)
    .where(where);
  return Number(row?.n ?? 0);
}

export async function getMetricsSnapshot(): Promise<MetricsSnapshot> {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Registrations
  const totalUsers = await countTable(users, users.createdAt);
  const last7dUsers = await countTable(users, users.createdAt, weekAgo);

  // Jobs
  const [publishedJobs, internalJobs, importedJobs] = await Promise.all([
    countTable(jobs, jobs.createdAt, undefined, eq(jobs.status, "published")),
    countTable(
      jobs,
      jobs.createdAt,
      undefined,
      and(eq(jobs.status, "published"), eq(jobs.source, "internal")),
    ),
    countTable(
      jobs,
      jobs.createdAt,
      undefined,
      and(eq(jobs.status, "published"), eq(jobs.source, "imported")),
    ),
  ]);

  // Applications
  const [last24hApps, last7dApps, mutualInterest] = await Promise.all([
    countTable(applications, applications.createdAt, dayAgo),
    countTable(applications, applications.createdAt, weekAgo),
    countTable(
      applications,
      applications.createdAt,
      undefined,
      eq(applications.status, "shortlisted"),
    ),
  ]);

  // Moderation queue
  const queue = await getDb()
    .select({
      status: sql<string>`status`,
      n: sql<number>`count(*)`,
    })
    .from(sql`moderation_queue`)
    .groupBy(sql`status`);
  const byStatus = { pending: 0, approved: 0, rejected: 0 };
  for (const row of queue) {
    if (row.status in byStatus)
      byStatus[row.status as keyof typeof byStatus] = Number(row.n);
  }
  const queueSize = Object.values(byStatus).reduce((a, b) => a + b, 0);

  // Emails
  const [emailsByStatus, emailsByType] = await Promise.all([
    getDb()
      .select({
        status: notificationEmails.status,
        n: sql<number>`count(*)`,
      })
      .from(notificationEmails)
      .groupBy(notificationEmails.status),
    getDb()
      .select({
        type: notificationEmails.type,
        n: sql<number>`count(*)`,
      })
      .from(notificationEmails)
      .groupBy(notificationEmails.type),
  ]);
  const emailStatus = { pending: 0, sent: 0, skipped: 0, failed: 0 };
  for (const row of emailsByStatus) {
    if (row.status in emailStatus)
      emailStatus[row.status as keyof typeof emailStatus] = Number(row.n);
  }
  const emailType: Record<string, number> = {};
  for (const row of emailsByType) {
    emailType[row.type] = Number(row.n);
  }

  // Matching (if table has data)
  const [matchingStats] = await getDb()
    .select({
      avgScore: sql<number | null>`avg(score)`,
      totalPairs: sql<number>`count(*)`,
      thresholdPairs: sql<number>`count(*) filter (where score >= 0.55)`,
    })
    .from(matchingResults);

  return {
    registrations: {
      total: totalUsers,
      last7d: last7dUsers,
      byRole: { candidates: 0, employers: 0 }, // placeholder, requires join
    },
    jobs: {
      published: publishedJobs,
      internal: internalJobs,
      imported: importedJobs,
    },
    applications: {
      last24h: last24hApps,
      last7d: last7dApps,
      mutualInterest,
    },
    moderation: {
      queueSize,
      byStatus,
    },
    emails: {
      byStatus: emailStatus,
      byType: emailType,
    },
    matching:
      matchingStats.totalPairs > 0
        ? {
            avgScore: matchingStats.avgScore,
            totalPairs: matchingStats.totalPairs,
            thresholdPairs: matchingStats.thresholdPairs,
          }
        : undefined,
  };
}
