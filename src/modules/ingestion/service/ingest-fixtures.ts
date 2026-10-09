import { matchesScamPattern } from "@/config/scam-patterns";
import { expireImportedJobs, saveImportedJob } from "@/modules/jobs/service";
import { normalizeSkill } from "@/modules/taxonomy/service";
import { apiFixtureAdapter } from "../adapters/api-fixture";
import { himalayasSource } from "../adapters/himalayas";
import { jobicySource } from "../adapters/jobicy";
import { withinCreateBudget, type LiveSource } from "../adapters/live";
import { remoteOkSource } from "../adapters/remoteok";
import { remotiveSource } from "../adapters/remotive";
import { rssFixtureAdapter } from "../adapters/rss-fixture";
import type { ImportAdapter, RawImportedJob } from "../adapters/types";
import * as repo from "../repo/import-repo";
import { pickDuplicate } from "./dedup";
import { normalizeImportedJob, type SkillResolver } from "./normalize";
import { decideOutcome, isMissingEverywhere } from "./outcome";

export const FIXTURE_ADAPTERS: readonly ImportAdapter[] = [
  apiFixtureAdapter,
  rssFixtureAdapter,
];

/**
 * Official APIs the founder approved for republishing (D18, D375). Each one
 * runs only when IMPORT_LIVE_ENABLED=true and its row is enabled with
 * republish allowed. The first live run creates that row turned on. A later
 * run does not turn a switched-off row back on.
 */
export const LIVE_SOURCES: readonly LiveSource[] = [
  remotiveSource,
  himalayasSource,
  jobicySource,
  remoteOkSource,
];

/** A source is imported at most once an hour (section 7, cron ≥ 1 h). */
export const MIN_RUN_INTERVAL_MS = 60 * 60 * 1000;
/** 13.1: at most 500 records per run. */
export const MAX_RECORDS_PER_RUN = 500;

export type ImportReport = repo.RunCounters & {
  source: string;
  skipped: boolean;
  error: string | null;
};

type Dependencies = {
  adapters: readonly ImportAdapter[];
  load: (adapter: ImportAdapter) => Promise<RawImportedJob[]>;
  resolveSkill: SkillResolver;
  isScam: (text: string) => boolean;
  now: () => Date;
  /** Live sources run less often, by their own terms (D375). */
  minIntervalMs?: number;
  /** When set, only this many new jobs are written; known ones still refresh. */
  createLimit?: number;
  /** Live sources: the stored row decides whether the source may run. */
  live?: LiveSource;
};

const defaults: Dependencies = {
  adapters: FIXTURE_ADAPTERS,
  load: (adapter) => adapter.loadFixture(),
  // Unknown skills land in skill_suggestions with source "import" (13.2).
  resolveSkill: async (value) => {
    const result = await normalizeSkill(value, "import");
    return result.result === "matched" ? result.skillId : null;
  },
  isScam: matchesScamPattern,
  now: () => new Date(),
};

function emptyCounters(): repo.RunCounters {
  return {
    fetched: 0,
    created: 0,
    updated: 0,
    merged: 0,
    rejected: 0,
    expired: 0,
  };
}

/** Runs every fixture source once (8A); no network access at all. */
export async function runFixtureImports(
  overrides: Partial<Dependencies> = {},
): Promise<ImportReport[]> {
  const deps: Dependencies = { ...defaults, ...overrides };
  const reports: ImportReport[] = [];
  for (const adapter of deps.adapters) {
    reports.push(await importSource(adapter, deps));
  }
  await repo.pruneImportRunHistory(deps.now());
  return reports;
}

/**
 * Runs every approved live source once (8B, D375), each by its own interval
 * and with a budget of new jobs per run so the catalog grows evenly.
 */
export async function runLiveImports(
  overrides: Partial<Dependencies> & { sources?: readonly LiveSource[] } = {},
): Promise<ImportReport[]> {
  const { sources = LIVE_SOURCES, ...rest } = overrides;
  const now = rest.now ?? defaults.now;
  const reports: ImportReport[] = [];
  for (const live of sources) {
    const adapter: ImportAdapter = {
      sourceName: live.sourceName,
      kind: live.kind,
      loadFixture: () => live.fetch(),
    };
    reports.push(
      await importSource(adapter, {
        ...defaults,
        load: () => live.fetch(),
        ...rest,
        minIntervalMs: live.minIntervalMs,
        createLimit: live.newPerRun,
        live,
      }),
    );
  }
  await repo.pruneImportRunHistory(now());
  return reports;
}

async function importSource(
  adapter: ImportAdapter,
  deps: Dependencies,
): Promise<ImportReport> {
  const now = deps.now();
  const source = deps.live
    ? await repo.ensureLiveSource(deps.live)
    : await repo.ensureFixtureSource(adapter);
  const counters = emptyCounters();
  const switchedOff =
    deps.live !== undefined && !(source.enabled && source.republishAllowed);
  const interval = deps.minIntervalMs ?? MIN_RUN_INTERVAL_MS;
  if (
    switchedOff ||
    (await repo.sourceStartedSince(
      source.id,
      new Date(now.getTime() - interval),
    ))
  ) {
    return {
      ...counters,
      source: adapter.sourceName,
      skipped: true,
      error: null,
    };
  }

  const run = await repo.beginImportRun(source.id, now);
  try {
    const loaded = (await deps.load(adapter)).slice(0, MAX_RECORDS_PER_RUN);
    const records = await withinBudget(source.id, loaded, deps.createLimit);
    counters.fetched = records.length;
    for (const raw of records) {
      const job = await normalizeImportedJob(
        raw,
        deps.resolveSkill,
        now,
        deps.isScam,
      );
      const company = await repo.findOrCreateImportedCompany(
        job.companyName,
        job.companyDomain,
      );
      const linkedJobId = await repo.findLinkedJobId(source.id, job.externalId);
      const duplicate = pickDuplicate(
        job,
        (
          await repo.findDuplicateCandidates({
            importedCompanyId: company.id,
            companyName: job.companyName,
            companyDomain: job.companyDomain,
            title: job.title,
            description: job.description,
          })
        ).filter((candidate) => candidate.jobId !== linkedJobId),
      );
      const outcome = decideOutcome({
        scam: job.scam,
        expired: job.expired,
        alreadyLinked: linkedJobId !== null,
        duplicate: duplicate?.source ?? null,
      });
      // Write into the linked job, or merge into an imported duplicate.
      const targetJobId =
        linkedJobId ??
        (duplicate?.source === "imported" ? duplicate.jobId : undefined);
      const saved = await saveImportedJob({
        jobId: targetJobId,
        companyId: company.id,
        title: job.title,
        description: job.description,
        category: job.category,
        employmentType: job.employmentType,
        timeZone: job.timeZone,
        skillIds: job.skillIds,
        sectors: job.sectors,
        seniority: job.seniority,
        applyUrl: job.applyUrl,
        expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
        status: outcome.status,
        reason: outcome.reason,
      });
      await repo.linkImportedSource(
        saved.id,
        source.id,
        job.externalId,
        job.applyUrl,
        now,
      );
      if (outcome.queueForReview) {
        await repo.queueRejectedImport(saved.id, outcome.reason);
      }
      counters[outcome.counter] += 1;
    }
    counters.expired += await expireMissing(source.id, now);
    await repo.finishImportRun(run.id, counters, null);
    await repo.markSourceRun(source.id, "success");
    return {
      ...counters,
      source: adapter.sourceName,
      skipped: false,
      error: null,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Import failed";
    await repo.finishImportRun(run.id, counters, message);
    await repo.markSourceRun(source.id, "error");
    return {
      ...counters,
      source: adapter.sourceName,
      skipped: false,
      error: message,
    };
  }
}

async function withinBudget(
  sourceId: string,
  records: RawImportedJob[],
  limit: number | undefined,
): Promise<RawImportedJob[]> {
  if (limit === undefined) return records;
  const linked = new Set<string>();
  for (const record of records) {
    const id = record.externalId.trim();
    if (await repo.findLinkedJobId(sourceId, id)) linked.add(id);
  }
  return withinCreateBudget(records, linked, limit);
}

/** Published jobs from this source that every one of their sources lost. */
async function expireMissing(sourceId: string, now: Date): Promise<number> {
  const unseen = await repo.sourceRowsNotSeenSince(sourceId, now);
  if (!unseen.length) return 0;
  const rows = await repo.sourceRowsOfJobs([
    ...new Set(unseen.map((r) => r.jobId)),
  ]);
  const byJob = new Map<
    string,
    { currentSource: boolean; finishedRunsSinceSeen: number }[]
  >();
  for (const row of rows) {
    const entry = {
      currentSource: row.sourceId === sourceId,
      finishedRunsSinceSeen: await repo.finishedRunsSince(
        row.sourceId,
        row.lastSeenAt,
      ),
    };
    byJob.set(row.jobId, [...(byJob.get(row.jobId) ?? []), entry]);
  }
  const missing = [...byJob.entries()]
    .filter(([, sources]) => isMissingEverywhere(sources))
    .map(([jobId]) => jobId);
  return expireImportedJobs(missing);
}

/** One named fixture source, or all of them. */
export async function runFixtureImport(sourceName?: string) {
  const adapters = sourceName
    ? FIXTURE_ADAPTERS.filter((adapter) => adapter.sourceName === sourceName)
    : FIXTURE_ADAPTERS;
  if (!adapters.length) throw new Error("Unknown fixture source");
  return runFixtureImports({ adapters });
}
