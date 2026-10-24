import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * D523: one block system for the 400 px panel and the full screen. A block
 * follows its own width (`@container` variants), never the window's, and
 * draws no inline style (CSP) and no HTML from the server.
 */
const DIR = join(process.cwd(), "src/components/bot/blocks");
const files = readdirSync(DIR).filter((name) => name.endsWith(".tsx"));

describe("Spoki block components", () => {
  it("are found", () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  for (const name of files) {
    const source = readFileSync(join(DIR, name), "utf8");
    it(`${name} uses container sizes, not window breakpoints`, () => {
      expect(source).not.toMatch(/(?<![@\w-])(?:max-)?(?:sm|md|lg|xl|2xl):/);
    });
    it(`${name} has no inline style or raw HTML`, () => {
      expect(source).not.toMatch(/style=\{/);
      expect(source).not.toContain("dangerouslySetInnerHTML");
    });
  }
});
