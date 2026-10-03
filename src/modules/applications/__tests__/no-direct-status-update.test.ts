import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

const statusUpdate =
  /update\s*\(\s*applications\s*\)|update\s+public\.applications/i;

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      found.push(...sourceFiles(full));
      continue;
    }
    if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      found.push(full);
    }
  }
  return found;
}

describe("application status writes", () => {
  it("updates applications.status only inside transitionApplication", () => {
    const hits: string[] = [];
    for (const file of sourceFiles(path.join(root, "src"))) {
      const rel = path.relative(root, file).replaceAll("\\", "/");
      if (rel.endsWith(".test.ts") || rel.includes("/__tests__/")) continue;
      if (
        rel === "src/modules/applications/service/transition-application.ts"
      ) {
        continue;
      }
      const text = readFileSync(file, "utf8");
      if (statusUpdate.test(text)) hits.push(rel);
    }
    expect(hits).toEqual([]);
  });
});
