import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  expandCatalog,
  renderSkillsMigration,
  SKILL_CATALOG,
} from "@/db/seed/skills";
import { SKILL_CATEGORIES } from "../schemas";

function normalizeNewlines(value: string): string {
  return value.replaceAll("\r\n", "\n");
}

describe("skill catalog", () => {
  const catalog = expandCatalog();

  it("bootstraps 80 to 120 skills across the ten categories", () => {
    expect(SKILL_CATALOG.length).toBeGreaterThanOrEqual(80);
    expect(SKILL_CATALOG.length).toBeLessThanOrEqual(120);
    expect(catalog).toHaveLength(SKILL_CATALOG.length);
    expect(new Set(catalog.map((entry) => entry.category))).toEqual(
      new Set(SKILL_CATEGORIES),
    );
  });

  it("gives every skill both names and at least two distinct aliases", () => {
    for (const entry of catalog) {
      expect(entry.nameEn.trim().length).toBeGreaterThan(0);
      expect(entry.nameRu.trim().length).toBeGreaterThan(0);
      expect(entry.aliases.length).toBeGreaterThanOrEqual(2);
    }
    const aliases = catalog.flatMap((entry) => entry.aliases);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(catalog.some((entry) => entry.slug === "react")).toBe(true);
  });

  it("keeps migration 0003 equal to the idempotent seed renderer", () => {
    const sql = fs.readFileSync("src/db/migrations/0003_skills.sql", "utf8");
    expect(normalizeNewlines(sql)).toBe(
      normalizeNewlines(renderSkillsMigration()),
    );
    // Conditional so the hosted migration role can run it (D40).
    expect(sql).toContain("CREATE EXTENSION pg_trgm WITH SCHEMA extensions");
    expect(sql).toContain(
      "IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm')",
    );
    expect(sql).toContain("public.enable_rls_deny_all('public.skills')");
    expect(sql).toContain(
      "public.enable_rls_deny_all('public.skills_aliases')",
    );
    expect(sql).toContain(
      "public.enable_rls_deny_all('public.skill_suggestions')",
    );
  });
});
