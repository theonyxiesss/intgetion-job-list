import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { skillSuggestions, skills, skillsAliases } from "@/db/schema";

export type SuggestionRow = typeof skillSuggestions.$inferSelect;

export type SuggestionCursor = { occurrences: number; id: string };

/**
 * Pending suggestions for the weekly review (11.1): most frequent first,
 * so the ones seen 3+ times are on top. Keyset pagination on
 * (occurrences desc, id desc).
 */
export async function listPendingSuggestions(
  limit: number,
  cursor?: SuggestionCursor,
): Promise<SuggestionRow[]> {
  const pending = eq(skillSuggestions.status, "pending");
  const after = cursor
    ? or(
        lt(skillSuggestions.occurrences, cursor.occurrences),
        and(
          eq(skillSuggestions.occurrences, cursor.occurrences),
          lt(skillSuggestions.id, cursor.id),
        ),
      )
    : undefined;
  return getDb()
    .select()
    .from(skillSuggestions)
    .where(after ? and(pending, after) : pending)
    .orderBy(desc(skillSuggestions.occurrences), desc(skillSuggestions.id))
    .limit(limit);
}

export async function findSuggestion(
  id: string,
): Promise<SuggestionRow | undefined> {
  const [row] = await getDb()
    .select()
    .from(skillSuggestions)
    .where(eq(skillSuggestions.id, id))
    .limit(1);
  return row;
}

export async function findActiveSkillById(
  id: string,
): Promise<{ id: string; slug: string } | undefined> {
  const [row] = await getDb()
    .select({ id: skills.id, slug: skills.slug })
    .from(skills)
    .where(and(eq(skills.id, id), eq(skills.isActive, true)))
    .limit(1);
  return row;
}

export type MapOutcome =
  | { kind: "mapped" }
  | { kind: "not_pending" }
  | { kind: "alias_taken"; skillId: string };

/**
 * Approves a pending suggestion and adds its normalized text as an alias of
 * the skill, in one transaction, so normalizeSkill matches it from now on.
 * An alias that already points to another skill is a conflict, not a remap.
 */
export async function mapSuggestion(
  id: string,
  skillId: string,
): Promise<MapOutcome> {
  return getDb().transaction(async (tx) => {
    const [suggestion] = await tx
      .select()
      .from(skillSuggestions)
      .where(eq(skillSuggestions.id, id))
      .for("update")
      .limit(1);
    if (!suggestion || suggestion.status !== "pending") {
      return { kind: "not_pending" } as const;
    }
    const [existing] = await tx
      .select({ skillId: skillsAliases.skillId })
      .from(skillsAliases)
      .where(eq(skillsAliases.aliasNormalized, suggestion.normalized))
      .limit(1);
    if (existing && existing.skillId !== skillId) {
      return { kind: "alias_taken", skillId: existing.skillId } as const;
    }
    if (!existing) {
      await tx
        .insert(skillsAliases)
        .values({ aliasNormalized: suggestion.normalized, skillId });
    }
    await tx
      .update(skillSuggestions)
      .set({ status: "approved", mappedSkillId: skillId })
      .where(eq(skillSuggestions.id, id));
    return { kind: "mapped" } as const;
  });
}

/** Rejects a pending suggestion; returns false when it was not pending. */
export async function rejectSuggestion(id: string): Promise<boolean> {
  const rows = await getDb()
    .update(skillSuggestions)
    .set({ status: "rejected" })
    .where(
      and(eq(skillSuggestions.id, id), eq(skillSuggestions.status, "pending")),
    )
    .returning({ id: skillSuggestions.id });
  return rows.length === 1;
}

/** Count used by the admin dashboard. */
export async function countPendingSuggestions(): Promise<number> {
  const [row] = await getDb()
    .select({ n: sql<number>`count(*)::int` })
    .from(skillSuggestions)
    .where(eq(skillSuggestions.status, "pending"));
  return Number(row?.n ?? 0);
}

/** Active catalog for the admin mapping form, grouped by category. */
export async function listActiveSkills(): Promise<
  {
    id: string;
    slug: string;
    nameEn: string;
    nameRu: string;
    category: string;
  }[]
> {
  return getDb()
    .select({
      id: skills.id,
      slug: skills.slug,
      nameEn: skills.nameEn,
      nameRu: skills.nameRu,
      category: skills.category,
    })
    .from(skills)
    .where(eq(skills.isActive, true))
    .orderBy(skills.category, skills.slug);
}
