import { sql } from "drizzle-orm";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { expandCatalog } from "@/db/seed/skills";
import { getDb } from "@/db/client";
import { hostedSsl, withoutSslMode } from "@/db/ssl";
import { SKILL_CATEGORIES } from "../schemas";
import { normalizeSkillText } from "../service/normalize-skill-text";
import {
  getSkillCatalogStats,
  normalizeSkill,
  seedSkills,
} from "../service/taxonomy-service";

const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const appUrl = process.env.DATABASE_URL;

if (!migrationUrl || !appUrl) {
  throw new Error(
    "Integration tests need DATABASE_MIGRATION_URL and DATABASE_URL.",
  );
}

const unknownRaw = "zzqnotacanonicalskilltoken";
const unknownKey = normalizeSkillText(unknownRaw);
const admin = new pg.Client({
  connectionString: withoutSslMode(migrationUrl),
  ssl: hostedSsl(migrationUrl),
});

beforeAll(async () => {
  await admin.connect();
});

afterAll(async () => {
  try {
    await getDb().execute(
      sql`delete from skill_suggestions where normalized = ${unknownKey}`,
    );
  } finally {
    await admin.end();
  }
});

describe("skill seed and normalizeSkill", () => {
  it("seeds an idempotent catalog and resolves the React examples", async () => {
    const catalog = expandCatalog();
    const aliasCount = catalog.reduce(
      (total, entry) => total + entry.aliases.length,
      0,
    );

    await seedSkills();
    const first = await getSkillCatalogStats();
    const react = await normalizeSkill("React.js");
    expect(react.result).toBe("matched");
    if (react.result !== "matched") return;
    const reactId = react.skillId;

    await seedSkills();
    const second = await getSkillCatalogStats();

    expect(first.skills).toBe(catalog.length);
    expect(first.skills).toBeGreaterThanOrEqual(80);
    expect(first.skills).toBeLessThanOrEqual(120);
    expect(first.aliases).toBe(aliasCount);
    expect(first.minAliases).toBeGreaterThanOrEqual(2);
    expect(first.categories).toEqual([...SKILL_CATEGORIES].sort());
    expect(second).toEqual(first);

    await expect(normalizeSkill("React.js")).resolves.toEqual({
      result: "matched",
      skillId: reactId,
      slug: "react",
    });
    await expect(normalizeSkill("ReactJS")).resolves.toMatchObject({
      result: "matched",
      skillId: reactId,
      slug: "react",
    });
    await expect(normalizeSkill("react 18")).resolves.toMatchObject({
      result: "matched",
      skillId: reactId,
      slug: "react",
    });
  });

  it("stores an unknown skill once and increments occurrences", async () => {
    const created = await normalizeSkill(unknownRaw, "import");
    expect(created).toMatchObject({
      result: "suggested",
      normalized: unknownKey,
      occurrences: 1,
    });
    if (created.result !== "suggested") return;

    const repeated = await normalizeSkill(unknownRaw.toUpperCase(), "bot");
    expect(repeated).toEqual({
      result: "suggested",
      suggestionId: created.suggestionId,
      normalized: unknownKey,
      occurrences: 2,
    });

    const rows = await getDb().execute<{
      source: string;
      raw_text: string;
      occurrences: number;
      n: number;
    }>(sql`
      select source, raw_text, occurrences,
        (select count(*)::int from skill_suggestions where normalized = ${unknownKey}) as n
      from skill_suggestions
      where normalized = ${unknownKey}
    `);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe("import");
    expect(rows[0]?.raw_text).toBe(unknownRaw);
    expect(Number(rows[0]?.occurrences)).toBe(2);
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it("does not store an empty skill", async () => {
    const before = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from skill_suggestions`,
    );
    await expect(normalizeSkill("   ")).resolves.toEqual({ result: "empty" });
    await expect(normalizeSkill("@@@")).resolves.toEqual({ result: "empty" });
    const after = await getDb().execute<{ n: number }>(
      sql`select count(*)::int as n from skill_suggestions`,
    );
    expect(Number(after[0]?.n)).toBe(Number(before[0]?.n));
  });

  it("hides skills from anon", async () => {
    await admin.query("BEGIN");
    try {
      await admin.query("SET LOCAL ROLE anon");
      const visible = await admin.query("SELECT slug FROM public.skills");
      expect(visible.rowCount).toBe(0);
      await expect(
        admin.query(
          "INSERT INTO public.skills (slug, name_en, name_ru, category) VALUES ('nope', 'No', 'Нет', 'engineering')",
        ),
      ).rejects.toThrow();
    } finally {
      await admin.query("ROLLBACK");
    }
  });
});
