import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { importRuns, importSources } from "@/db/schema";

/** Import panel for admins (10A, D83); sources switch on and off (D342). */
export async function listImportSources() {
  return getDb()
    .select({
      id: importSources.id,
      name: importSources.name,
      kind: importSources.kind,
      enabled: importSources.enabled,
      republishAllowed: importSources.republishAllowed,
      lastRunAt: importSources.lastRunAt,
      lastStatus: importSources.lastStatus,
    })
    .from(importSources)
    .orderBy(importSources.name);
}

/** The admin switch; returns null for an unknown source. */
export async function setImportSourceEnabled(id: string, enabled: boolean) {
  const [row] = await getDb()
    .update(importSources)
    .set({ enabled })
    .where(eq(importSources.id, id))
    .returning({
      id: importSources.id,
      name: importSources.name,
      enabled: importSources.enabled,
    });
  return row ?? null;
}

export async function listImportRuns(limit: number) {
  return getDb()
    .select({
      id: importRuns.id,
      source: importSources.name,
      startedAt: importRuns.startedAt,
      finishedAt: importRuns.finishedAt,
      fetched: importRuns.fetched,
      created: importRuns.created,
      updated: importRuns.updated,
      merged: importRuns.merged,
      rejected: importRuns.rejected,
      expired: importRuns.expired,
      error: importRuns.error,
    })
    .from(importRuns)
    .innerJoin(importSources, eq(importSources.id, importRuns.sourceId))
    .orderBy(desc(importRuns.startedAt))
    .limit(limit);
}
