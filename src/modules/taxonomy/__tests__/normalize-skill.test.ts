import { beforeEach, describe, expect, it, vi } from "vitest";
import * as skillsRepo from "../repo/skills";
import { normalizeSkill, seedSkills } from "../service/taxonomy-service";

vi.mock("../repo/skills", () => ({
  findActiveSkillByAlias: vi.fn(),
  findActiveSkillBySlug: vi.fn(),
  findActiveSkillsBySimilarity: vi.fn(),
  insertSkillSuggestion: vi.fn(),
  seedSkillCatalog: vi.fn(),
  readSkillCatalogStats: vi.fn(),
}));

const repo = vi.mocked(skillsRepo);
const react = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "react",
};
const other = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "reactnative",
};

describe("normalizeSkill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the alias hit and does not continue", async () => {
    repo.findActiveSkillByAlias.mockResolvedValue(react);

    await expect(normalizeSkill("React.js")).resolves.toEqual({
      result: "matched",
      skillId: react.id,
      slug: "react",
    });
    expect(repo.findActiveSkillByAlias).toHaveBeenCalledWith("react");
    expect(repo.findActiveSkillBySlug).not.toHaveBeenCalled();
    expect(repo.findActiveSkillsBySimilarity).not.toHaveBeenCalled();
    expect(repo.insertSkillSuggestion).not.toHaveBeenCalled();
  });

  it("uses the slug when no alias is stored under the lookup key", async () => {
    repo.findActiveSkillByAlias.mockResolvedValue(undefined);
    repo.findActiveSkillBySlug.mockResolvedValue(react);

    await expect(normalizeSkill("ReactJS")).resolves.toMatchObject({
      result: "matched",
      slug: "react",
    });
    expect(repo.findActiveSkillsBySimilarity).not.toHaveBeenCalled();
  });

  it("accepts one trigram candidate at 0.85", async () => {
    repo.findActiveSkillByAlias.mockResolvedValue(undefined);
    repo.findActiveSkillBySlug.mockResolvedValue(undefined);
    repo.findActiveSkillsBySimilarity.mockResolvedValue([react]);

    await expect(normalizeSkill("reakt")).resolves.toMatchObject({
      result: "matched",
      slug: "react",
    });
    expect(repo.findActiveSkillsBySimilarity).toHaveBeenCalledWith(
      "reakt",
      0.85,
    );
  });

  it("records a suggestion when trigram similarity is ambiguous", async () => {
    repo.findActiveSkillByAlias.mockResolvedValue(undefined);
    repo.findActiveSkillBySlug.mockResolvedValue(undefined);
    repo.findActiveSkillsBySimilarity.mockResolvedValue([react, other]);
    repo.insertSkillSuggestion.mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
      normalized: "reakt",
      occurrences: 1,
    });

    await expect(normalizeSkill("reakt", "bot")).resolves.toEqual({
      result: "suggested",
      suggestionId: "33333333-3333-4333-8333-333333333333",
      normalized: "reakt",
      occurrences: 1,
    });
    expect(repo.insertSkillSuggestion).toHaveBeenCalledWith({
      rawText: "reakt",
      normalized: "reakt",
      source: "bot",
    });
  });

  it("defaults the suggestion source to user", async () => {
    repo.findActiveSkillByAlias.mockResolvedValue(undefined);
    repo.findActiveSkillBySlug.mockResolvedValue(undefined);
    repo.findActiveSkillsBySimilarity.mockResolvedValue([]);
    repo.insertSkillSuggestion.mockResolvedValue({
      id: "suggestion",
      normalized: "notaskill",
      occurrences: 4,
    });

    await expect(normalizeSkill("notaskill")).resolves.toMatchObject({
      result: "suggested",
      occurrences: 4,
    });
    expect(repo.insertSkillSuggestion).toHaveBeenCalledWith({
      rawText: "notaskill",
      normalized: "notaskill",
      source: "user",
    });
  });

  it("does not write a suggestion for an empty key", async () => {
    await expect(normalizeSkill("   ")).resolves.toEqual({ result: "empty" });
    await expect(normalizeSkill("@@@")).resolves.toEqual({ result: "empty" });
    expect(repo.findActiveSkillByAlias).not.toHaveBeenCalled();
    expect(repo.insertSkillSuggestion).not.toHaveBeenCalled();
  });

  it("rejects an unknown source", async () => {
    await expect(normalizeSkill("React", "email" as "user")).rejects.toThrow();
  });
});

describe("seedSkills", () => {
  it("upserts through the repo", async () => {
    repo.seedSkillCatalog.mockResolvedValue();
    await seedSkills();
    expect(repo.seedSkillCatalog).toHaveBeenCalledOnce();
  });
});
