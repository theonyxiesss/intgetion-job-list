import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  catalogTag,
  inferImportedMarkers,
  isSensitiveSector,
  JOB_CATEGORIES,
  PERKS,
  SECTORS,
  sectorsForCard,
  seniorityPenalty,
} from "./markers";

describe("job markers", () => {
  it("keeps the migration lists aligned with the source of truth", () => {
    const sql = readFileSync("src/db/migrations/0019_markers.sql", "utf8");
    for (const sector of SECTORS) expect(sql).toContain(`'${sector}'`);
    for (const perk of PERKS) expect(sql).toContain(`'${perk}'`);
    for (const category of ["legal", "content", "community", "research"]) {
      expect(sql).toContain(`'${category}'`);
      expect(JOB_CATEGORIES).toContain(category);
    }
    expect(sql).toContain("'web3js'");
    expect(sql).not.toContain("0003");
  });

  it("infers a specific sector before the generic web3 label", () => {
    const markers = inferImportedMarkers(
      "Solidity engineer for a DeFi protocol on Ethereum",
    );
    expect(markers.sectors[0]).toBe("defi");
    expect(markers.sectors).toContain("web3");
    expect(markers.sectors.length).toBeLessThanOrEqual(3);
  });

  it("maps intern and lead before the generic senior word", () => {
    expect(inferImportedMarkers("Senior solidity").seniority).toBe("senior");
    expect(inferImportedMarkers("Lead engineer, senior team").seniority).toBe(
      "lead",
    );
    expect(inferImportedMarkers("Junior internship").seniority).toBe(
      "internship",
    );
  });

  it("shows Web3 sectors first and penalises a wide seniority gap", () => {
    expect(sectorsForCard(["fintech", "defi", "web3"])).toEqual([
      "defi",
      "web3",
    ]);
    expect(seniorityPenalty("entry", "lead")).toBe(0.9);
    expect(seniorityPenalty("entry", "mid")).toBe(1);
    expect(seniorityPenalty(null, "lead")).toBe(1);
    expect(isSensitiveSector(["memecoins"])).toBe(true);
    expect(catalogTag("high-paying")?.kind).toBe("high-paying");
    expect(catalogTag("missing")).toBeNull();
  });
});
