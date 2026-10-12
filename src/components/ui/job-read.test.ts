import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) =>
  readFileSync(path.join(process.cwd(), file), "utf8");

/** Every className string literal in a component source. */
function classNames(source: string): string[] {
  return [...source.matchAll(/className="([^"]*)"/g)].map((m) => m[1]);
}

describe("job blocks stay readable (D398)", () => {
  it("never pairs line-clamp with a display utility that breaks it", () => {
    for (const file of [
      "src/components/ui/job-card.tsx",
      "src/app/[locale]/jobs/[id]/page.tsx",
    ]) {
      const broken = classNames(read(file)).filter(
        (cls) =>
          /\bline-clamp-\d/.test(cls) &&
          /(^|[\s:])(block|hidden|flex|grid|inline)(\s|$)/.test(cls),
      );
      expect(broken, file).toEqual([]);
    }
  });

  it("shows the card summary on narrow cards too", () => {
    const summary = classNames(read("src/components/ui/job-card.tsx")).find(
      (cls) => cls.includes("max-w-[65ch]"),
    );
    expect(summary).toBeDefined();
    expect(summary).toContain("line-clamp-3");
    expect(summary).not.toMatch(/(^|\s)hidden(\s|$)/);
  });

  it("keeps the job description about 68 letters wide, with its line breaks", () => {
    const page = classNames(read("src/app/[locale]/jobs/[id]/page.tsx"));
    const description = page.find((cls) => cls.startsWith("t-body-l"));
    expect(description).toContain("max-w-[56ch]");
    expect(description).toContain("whitespace-pre-wrap");
    expect(page.some((cls) => cls.includes("max-w-[68ch]"))).toBe(false);
  });
});
