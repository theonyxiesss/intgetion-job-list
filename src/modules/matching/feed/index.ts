/**
 * The /matches feed (6B): stored matches joined with the public job DTO of
 * 4A. Lives outside service/ because it reads the jobs module, and the jobs
 * module reads matching/service to queue a recompute on publish.
 */
import { listPublicJobsByIds } from "@/modules/jobs/service";
import {
  clampLimit,
  decodeCursor,
  getMatches,
  HIDDEN_TAB_LIMIT,
  isNewJob,
  pageOf,
  profileHints,
  readExcludedSetsForUser,
  readHiddenJobsForUser,
  readHideReasonCountsForUser,
  sortByScore,
  visibleMatches,
  type MatchItem,
  type MatchTab,
  type ProfileHint,
} from "../service";

export type PublicJob = Awaited<ReturnType<typeof listPublicJobsByIds>>[number];

export interface FeedItem {
  job: PublicJob;
  /** null on the hidden tab: a hidden job is not scored */
  score: number | null;
  explain: MatchItem["explain"];
}

export interface MatchFeed {
  items: FeedItem[];
  nextCursor: string | null;
  lowData: boolean;
  profileHints: ProfileHint[];
  counts: Record<MatchTab, number>;
}

export class InvalidCursorError extends Error {}

type Scored = MatchItem & { job: PublicJob; companyId: string };

async function scoredItems(
  userId: string,
  locale: string,
  now: Date,
): Promise<{ items: Scored[]; lowData: boolean }> {
  const [list, excluded] = await Promise.all([
    getMatches(userId, { now }),
    readExcludedSetsForUser(userId),
  ]);
  const jobs = await listPublicJobsByIds(
    list.items.map((item) => item.jobId),
    locale,
  );
  const byId = new Map(jobs.map((job) => [job.id, job]));
  const joined: Scored[] = [];
  for (const item of list.items) {
    const job = byId.get(item.jobId);
    // Unpublished or company suspended since the row was cached.
    if (!job) continue;
    joined.push({ ...item, job, companyId: job.company.id });
  }
  return {
    items: sortByScore(visibleMatches(joined, excluded)),
    lowData: list.lowData,
  };
}

async function hiddenItems(userId: string, locale: string) {
  const hidden = await readHiddenJobsForUser(userId, HIDDEN_TAB_LIMIT);
  const jobs = await listPublicJobsByIds(
    hidden.map((row) => row.jobId),
    locale,
  );
  const byId = new Map(jobs.map((job) => [job.id, job]));
  return hidden
    .map((row) => byId.get(row.jobId))
    .filter((job): job is PublicJob => job !== undefined)
    .map((job): FeedItem => ({ job, score: null, explain: [] }));
}

export async function getMatchFeed(
  userId: string,
  options: {
    tab?: MatchTab;
    cursor?: string | null;
    limit?: number;
    locale?: string;
    now?: Date;
  } = {},
): Promise<MatchFeed> {
  const tab = options.tab ?? "all";
  const locale = options.locale ?? "en";
  const now = options.now ?? new Date();
  const offset = decodeCursor(options.cursor);
  if (offset === null) throw new InvalidCursorError("bad cursor");
  const limit = clampLimit(options.limit);

  const [scored, hidden, reasons] = await Promise.all([
    scoredItems(userId, locale, now),
    hiddenItems(userId, locale),
    readHideReasonCountsForUser(userId, now),
  ]);
  const all: FeedItem[] = scored.items.map(({ job, score, explain }) => ({
    job,
    score,
    explain,
  }));
  const fresh = all.filter((item) => isNewJob(item.job.publishedAt, now));
  const source = tab === "hidden" ? hidden : tab === "new" ? fresh : all;
  const page = pageOf(source, offset, limit);
  return {
    items: page.items,
    nextCursor: page.nextCursor,
    lowData: scored.lowData,
    profileHints: profileHints(reasons),
    counts: { all: all.length, new: fresh.length, hidden: hidden.length },
  };
}

/** "Why it fits" on a job page: the stored match, if the job is shown. */
export async function getMatchForJob(
  userId: string,
  jobId: string,
  now: Date = new Date(),
): Promise<{ score: number; explain: MatchItem["explain"] } | null> {
  const list = await getMatches(userId, { now });
  const item = list.items.find((entry) => entry.jobId === jobId);
  if (!item) return null;
  const excluded = await readExcludedSetsForUser(userId);
  if (excluded.jobIds.has(jobId)) return null;
  return { score: item.score, explain: item.explain };
}
