import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { expandCatalog } from "@/db/seed/skills";
import {
  jobSkills,
  jobs,
  skillSuggestions,
  skills,
  skillsAliases,
} from "@/db/schema";
import type { SkillCatalogStats } from "../api/dto";
import type { SkillSource } from "../schemas";

export type SkillRef = {
  id: string;
  slug: string;
};

export async function findActiveSkillByAlias(
  aliasNormalized: string,
): Promise<SkillRef | undefined> {
  const [row] = await getDb()
    .select({ id: skills.id, slug: skills.slug })
    .from(skillsAliases)
    .innerJoin(skills, eq(skills.id, skillsAliases.skillId))
    .where(
      and(
        eq(skillsAliases.aliasNormalized, aliasNormalized),
        eq(skills.isActive, true),
      ),
    )
    .limit(1);
  return row;
}

export async function findActiveSkillBySlug(
  slug: string,
): Promise<SkillRef | undefined> {
  const [row] = await getDb()
    .select({ id: skills.id, slug: skills.slug })
    .from(skills)
    .where(and(eq(skills.slug, slug), eq(skills.isActive, true)))
    .limit(1);
  return row;
}

export async function findActiveSkillsBySimilarity(
  key: string,
  threshold: number,
): Promise<SkillRef[]> {
  const rows = await getDb().execute<{ id: string; slug: string }>(sql`
    select s.id, s.slug
    from public.skills s
    where s.is_active
      and (
        public.skill_similarity(s.slug, ${key}) >= ${threshold}
        or exists (
          select 1
          from public.skills_aliases a
          where a.skill_id = s.id
            and public.skill_similarity(a.alias_normalized, ${key}) >= ${threshold}
        )
      )
  `);
  return rows.map((row) => ({ id: row.id, slug: row.slug }));
}

export async function insertSkillSuggestion(input: {
  rawText: string;
  normalized: string;
  source: SkillSource;
}): Promise<{ id: string; normalized: string; occurrences: number }> {
  const [row] = await getDb()
    .insert(skillSuggestions)
    .values({
      rawText: input.rawText,
      normalized: input.normalized,
      source: input.source,
    })
    .onConflictDoUpdate({
      target: skillSuggestions.normalized,
      set: {
        occurrences: sql`${skillSuggestions.occurrences} + 1`,
      },
    })
    .returning({
      id: skillSuggestions.id,
      normalized: skillSuggestions.normalized,
      occurrences: skillSuggestions.occurrences,
    });
  if (!row) throw new Error("skill suggestion was not stored");
  return {
    id: row.id,
    normalized: row.normalized,
    occurrences: Number(row.occurrences),
  };
}

/** Upserts the canonical catalog. Does not delete rows removed from the catalog. */
export async function seedSkillCatalog(): Promise<void> {
  const catalog = expandCatalog();
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const entry of catalog) {
      await tx
        .insert(skills)
        .values({
          slug: entry.slug,
          nameEn: entry.nameEn,
          nameRu: entry.nameRu,
          category: entry.category,
        })
        .onConflictDoUpdate({
          target: skills.slug,
          set: {
            nameEn: entry.nameEn,
            nameRu: entry.nameRu,
            category: entry.category,
          },
        });
    }

    const stored = await tx
      .select({ id: skills.id, slug: skills.slug })
      .from(skills);
    const idBySlug = new Map(stored.map((row) => [row.slug, row.id]));

    for (const entry of catalog) {
      const skillId = idBySlug.get(entry.slug);
      if (!skillId) throw new Error(`missing skill id for ${entry.slug}`);
      for (const alias of entry.aliases) {
        await tx
          .insert(skillsAliases)
          .values({ aliasNormalized: alias, skillId })
          .onConflictDoUpdate({
            target: skillsAliases.aliasNormalized,
            set: { skillId },
          });
      }
    }
  });
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string" || !value.startsWith("{")) return [];
  if (value === "{}") return [];
  return value
    .slice(1, -1)
    .split(",")
    .map((item) => item.replaceAll('"', ""));
}

export async function readSkillCatalogStats(): Promise<SkillCatalogStats> {
  const rows = await getDb().execute<{
    skills: number;
    aliases: number;
    min_aliases: number;
    categories: unknown;
  }>(sql`
    select
      (select count(*)::int from public.skills) as skills,
      (select count(*)::int from public.skills_aliases) as aliases,
      (
        select coalesce(min(alias_count), 0)::int
        from (
          select count(*)::int as alias_count
          from public.skills_aliases
          group by skill_id
        ) counts
      ) as min_aliases,
      (
        select coalesce(array_agg(distinct category order by category), '{}')
        from public.skills
      ) as categories
  `);
  const row = rows[0];
  return {
    skills: Number(row?.skills ?? 0),
    aliases: Number(row?.aliases ?? 0),
    minAliases: Number(row?.min_aliases ?? 0),
    categories: asStringArray(row?.categories),
  };
}

/** Every alias of an active skill, as a lookup map (D290). */
export async function listActiveSkillAliases(): Promise<Map<string, string>> {
  const rows = await getDb()
    .select({
      alias: skillsAliases.aliasNormalized,
      skillId: skillsAliases.skillId,
    })
    .from(skillsAliases)
    .innerJoin(skills, eq(skills.id, skillsAliases.skillId))
    .where(eq(skills.isActive, true));
  return new Map(rows.map((row) => [row.alias, row.skillId]));
}

/** Published jobs that have no skills yet, oldest first (D290). */
export async function listJobsWithoutSkills(
  limit: number,
): Promise<{ id: string; text: string }[]> {
  return getDb()
    .select({
      id: jobs.id,
      text: sql<string>`${jobs.title} || ' ' || ${jobs.description}`,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "published"),
        sql`not exists (select 1 from public.job_skills js where js.job_id = ${jobs.id})`,
      ),
    )
    .orderBy(jobs.createdAt)
    .limit(limit);
}

/** Attaches the found skills. Weight 2 — guessed from text, not stated (D290). */
export async function attachJobSkills(
  jobId: string,
  skillIds: readonly string[],
): Promise<void> {
  if (skillIds.length === 0) return;
  await getDb()
    .insert(jobSkills)
    .values(skillIds.map((skillId) => ({ jobId, skillId, weight: 2 })))
    .onConflictDoNothing();
}
