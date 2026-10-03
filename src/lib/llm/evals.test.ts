import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { expandCatalog } from "@/db/seed/skills";
import { isValidTimeZone } from "@/lib/tz";
import {
  adversarialCase,
  ATTACK_TYPES,
  goldenDialog,
} from "../../../evals/schema";
import { redactPii } from "./redact";

const root = join(process.cwd(), "evals");
const load = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((name) => name.endsWith(".json"))
    .map((name) => ({
      name,
      data: JSON.parse(readFileSync(join(root, dir, name), "utf8")) as unknown,
    }));

const golden = load("onboarding").map(({ name, data }) => ({
  name,
  dialog: goldenDialog.parse(data),
}));
const adversarial = load("adversarial").map(({ name, data }) => ({
  name,
  item: adversarialCase.parse(data),
}));
const slugs = new Set(expandCatalog().map((skill) => skill.slug));

describe("golden onboarding dialogs (19.3)", () => {
  it("has exactly 20, split evenly between en and ru, ids match files", () => {
    expect(golden).toHaveLength(20);
    expect(golden.filter((g) => g.dialog.locale === "en")).toHaveLength(10);
    for (const { name, dialog } of golden) {
      expect(name).toBe(`${dialog.id}.json`);
      expect(dialog.id).toContain(`-${dialog.locale}-`);
    }
  });

  it("uses only catalog skill slugs and valid IANA zones", () => {
    for (const { dialog } of golden) {
      for (const skill of dialog.expected.skills) {
        expect(slugs.has(skill), `${dialog.id}: ${skill}`).toBe(true);
      }
      expect(isValidTimeZone(dialog.expected.timezone), dialog.id).toBe(true);
      if (dialog.browserTimezone) {
        expect(isValidTimeZone(dialog.browserTimezone)).toBe(true);
      }
    }
  });

  it("declares the PII in its turns, and redaction removes it", () => {
    const withPii = golden.filter((g) => g.dialog.piiInTurns.length);
    expect(withPii.length).toBeGreaterThanOrEqual(5);
    for (const { dialog } of golden) {
      const redacted = dialog.turns.map((t) => redactPii(t.user)).join("\n");
      for (const kind of dialog.piiInTurns) {
        expect(redacted, dialog.id).toContain(`[${kind}]`);
      }
      expect(redacted).not.toMatch(/@example\.|example\.com|\+\d{6,}/);
    }
  });
});

describe("adversarial cases (19.3)", () => {
  it("has at least 15 and covers every attack type", () => {
    expect(adversarial.length).toBeGreaterThanOrEqual(15);
    for (const attack of ATTACK_TYPES) {
      expect(
        adversarial.some((a) => a.item.attack === attack),
        attack,
      ).toBe(true);
    }
    for (const { name, item } of adversarial) {
      expect(name).toBe(`${item.id}.json`);
    }
  });

  it("puts instruction attacks into untrusted content", () => {
    for (const { item } of adversarial.filter(
      (a) => a.item.attack === "instruction_in_job",
    )) {
      expect(item.untrusted, item.id).toBeDefined();
    }
  });
});
