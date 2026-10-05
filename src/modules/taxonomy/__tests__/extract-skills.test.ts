import { describe, expect, it } from "vitest";
import { normalizeSkillText } from "../service/normalize-skill-text";
import {
  extractSkillIds,
  MAX_EXTRACTED_SKILLS,
  skillKeysInText,
} from "../service/extract-skills";

/** A stand-in for the alias table, keyed the same way (D42). */
function aliases(pairs: Record<string, string>): Map<string, string> {
  return new Map(
    Object.entries(pairs).map(([alias, id]) => [normalizeSkillText(alias), id]),
  );
}

describe("skillKeysInText (D290)", () => {
  it("offers one, two and three word runs", () => {
    const keys = skillKeysInText("Senior Machine Learning Engineer");
    expect(keys).toContain(normalizeSkillText("machine learning"));
    expect(keys).toContain(normalizeSkillText("senior"));
  });

  it("puts longer runs first, so the precise skill wins", () => {
    const keys = skillKeysInText("Apache Airflow pipelines");
    const airflow = keys.indexOf(normalizeSkillText("apache airflow"));
    const apache = keys.indexOf(normalizeSkillText("apache"));
    expect(airflow).toBeGreaterThanOrEqual(0);
    expect(airflow).toBeLessThan(apache);
  });

  it("leaves out keys too short or too common to mean a skill", () => {
    const keys = skillKeysInText("We go lean and use R and AI daily");
    expect(keys).not.toContain("go");
    expect(keys).not.toContain("lean");
    expect(keys).not.toContain("ai");
  });

  it("handles the odd spellings the alias key already covers", () => {
    expect(skillKeysInText("We write C++ and C# here")).toContain("cpp");
    expect(skillKeysInText("Node.js and React.js")).toContain("react");
  });
});

describe("extractSkillIds (D290)", () => {
  const table = aliases({
    solidity: "s-sol",
    "smart contracts": "s-sc",
    typescript: "s-ts",
    react: "s-react",
    postgresql: "s-pg",
  });

  it("finds the skills a job text names, without repeats", () => {
    const found = extractSkillIds(
      "Solidity engineer: write smart contracts, review Solidity, ship TypeScript tooling.",
      table,
    );
    expect(found).toContain("s-sol");
    expect(found).toContain("s-sc");
    expect(found).toContain("s-ts");
    expect(new Set(found).size).toBe(found.length);
  });

  it("finds nothing in a text that names no skill", () => {
    expect(extractSkillIds("A calm place to do good work.", table)).toEqual([]);
  });

  it("never attaches more than the cap", () => {
    // Distinct words: a trailing digit would be stripped as a version (D42).
    const names = Array.from(
      { length: 30 },
      (_, i) => `alpha${String.fromCharCode(97 + i)}skill`,
    );
    const many = aliases(
      Object.fromEntries(names.map((name, i) => [name, `id-${i}`])),
    );
    const text = names.join(" ");
    expect(extractSkillIds(text, many)).toHaveLength(MAX_EXTRACTED_SKILLS);
  });

  it("stays quiet on an empty alias table", () => {
    expect(extractSkillIds("Solidity and React", new Map())).toEqual([]);
  });
});
