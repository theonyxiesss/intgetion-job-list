import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { privacyHash } from "@/lib/privacy-hash";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
};

/** Appends one audit row (section 16.1). The raw IP is never stored. */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  await getDb()
    .insert(auditLogs)
    .values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      diff: entry.diff ?? null,
      ipHash: entry.ip && entry.ip !== "unknown" ? privacyHash(entry.ip) : null,
    });
}
