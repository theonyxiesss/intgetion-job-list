import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isValidTimeZone } from "@/lib/tz";
import {
  CATALOG_TAGS,
  catalogTag,
  inferImportedMarkers,
  isSensitiveSector,
  JOB_CATEGORIES,
  MARKER_SKILLS,
  PERKS,
  region,
  REGIONS,
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

describe("collection pages for skills and regions (D294, D295)", () => {
  it("gives every marker skill a page and keeps slugs unique", () => {
    for (const skill of MARKER_SKILLS) {
      const tag = catalogTag(skill.slug);
      expect(tag, skill.slug).not.toBeNull();
      expect(tag?.kind, skill.slug).toBe("skill");
    }
    const slugs = CATALOG_TAGS.map((tag) => tag.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("describes a region by one real time zone and an overlap", () => {
    const tag = catalogTag("latam");
    expect(tag?.kind).toBe("region");
    expect(region("latam")?.timezone).toBe("America/Bogota");
    expect(region("mars")).toBeNull();
    for (const item of REGIONS) {
      expect(isValidTimeZone(item.timezone), item.slug).toBe(true);
      expect(item.minOverlap).toBeGreaterThan(0);
      expect(item.minOverlap).toBeLessThanOrEqual(12);
    }
  });
});
