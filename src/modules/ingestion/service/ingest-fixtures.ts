import { normalizeSkill } from "@/modules/taxonomy/service";
import { matchesScamPattern } from "@/config/scam-patterns";
import { expireImportedJobs, saveImportedJob } from "@/modules/jobs/service";
import { apiFixtureAdapter } from "../adapters/api-fixture";
import { rssFixtureAdapter } from "../adapters/rss-fixture";
import type { ImportAdapter, RawImportedJob } from "../adapters/types";
import {
  beginImportRun,
  completeImportRun,
  ensureFixtureSource,
  findDuplicateJob,
  findOrCreateImportedCompany,
  linkImportedSource,
  markSourceRun,
  pruneImportRunHistory,
  sourceStartedWithin,
  staleLinkedJobs,
} from "../repo/import-repo";
import { normalizeImportedJob } from "./normalize";

export const FIXTURE_ADAPTERS = [apiFixtureAdapter, rssFixtureAdapter] as const;
const HOUR = 60 * 60 * 1000;

export type ImportMetrics = {
  source: string;
  fetched: number;
  created: number;
  updated: number;
  merged: number;
  rejected: number;
  expired: number;
  skipped: boolean;
};

type ImportDependencies = {
  adapters?: readonly ImportAdapter[];
  load: (adapter: ImportAdapter) => Promise<RawImportedJob[]>;
  normalize: typeof normalizeImportedJob;
  resolveSkill: typeof normalizeSkill;
  scam: typeof matchesScamPattern;
  now?: () => Date;
};

export async function runFixtureImports(
  overrides: Partial<ImportDependencies> = {},
): Promise<ImportMetrics[]> {
  // 8A contains fixture adapters only. Even an accidental live flag never enables network access.
  if (process.env.IMPORT_LIVE_ENABLED === "true")
    throw new Error("Live imports are not implemented in 8A");
  const deps: ImportDependencies = {
    adapters: FIXTURE_ADAPTERS,
    load: (adapter) => adapter.loadFixture(),
    normalize: normalizeImportedJob,
    resolveSkill: normalizeSkill,
    scam: matchesScamPattern,
    now: () => new Date(),
    ...overrides,
  };
  const now = deps.now!();
  const reports: ImportMetrics[] = [];
  for (const adapter of deps.adapters!) {
    const source = await ensureFixtureSource(adapter);
    if (await sourceStartedWithin(source.id, new Date(now.getTime() - HOUR))) {
      reports.push({
        source: adapter.sourceName,
        fetched: 0,
        created: 0,
        updated: 0,
        merged: 0,
        rejected: 0,
        expired: 0,
        skipped: true,
      });
      continue;
    }
    const run = await beginImportRun(source.id);
    const metrics: ImportMetrics = {
      source: adapter.sourceName,
      fetched: 0,
      created: 0,
      updated: 0,
      merged: 0,
      rejected: 0,
      expired: 0,
      skipped: false,
    };
    try {
      const rawJobs = await deps.load(adapter);
      metrics.fetched = rawJobs.length;
      for (const raw of rawJobs) {
        const normalized = await deps.normalize(
          raw,
          (skill) => deps.resolveSkill(skill, "import"),
          now,
          deps.scam,
        );
        const company = await findOrCreateImportedCompany(
          normalized.companyName,
          normalized.companyDomain,
        );
        const duplicate = await findDuplicateJob({
          companyId: company.id,
          title: normalized.title,
          description: normalized.description,
          sourceId: source.id,
          externalId: normalized.externalId,
        });
        const status = normalized.scam
          ? "removed"
          : normalized.expired
            ? "expired"
            : duplicate?.internal
              ? "removed"
              : "published";
        const reason = normalized.scam
          ? "scam_pattern_rejected"
          : normalized.expired
            ? "source_expired"
            : duplicate?.internal
              ? "duplicate_of_internal"
              : duplicate
                ? "merged_duplicate"
                : "imported_from_fixture";
        const job = await saveImportedJob({
          jobId: duplicate?.job.id,
          companyId: company.id,
          title: normalized.title,
          description: normalized.description,
          category: normalized.category,
          skillIds: normalized.skills.map(({ skillId }) => skillId),
          applyUrl: normalized.applyUrl,
          expiresAt: normalized.expiresAt
            ? new Date(normalized.expiresAt)
            : null,
          status,
          reason,
        });
        await linkImportedSource(
          job.id,
          source.id,
          normalized.externalId,
          normalized.applyUrl,
        );
        if (normalized.scam || duplicate?.internal) metrics.rejected += 1;
        else if (normalized.expired) metrics.expired += 1;
        else if (duplicate?.exactSource) metrics.updated += 1;
        else if (duplicate) metrics.merged += 1;
        else metrics.created += 1;
      }
      const stale = await staleLinkedJobs(source.id, now);
      if (stale.length) {
        metrics.expired += await expireImportedJobs(stale);
      }
      await completeImportRun(run.id, metrics);
      await markSourceRun(source.id, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1000) : "Import failed";
      await completeImportRun(run.id, { ...metrics, error: message });
      await markSourceRun(source.id, "error");
      reports.push(metrics);
      throw error;
    }
    reports.push(metrics);
  }
  await pruneImportRunHistory(now);
  return reports;
}

export async function runFixtureImport(adapterName?: string) {
  const adapters = adapterName
    ? FIXTURE_ADAPTERS.filter((adapter) => adapter.sourceName === adapterName)
    : FIXTURE_ADAPTERS;
  if (!adapters.length) throw new Error("Unknown fixture source");
  return runFixtureImports({ adapters });
}
