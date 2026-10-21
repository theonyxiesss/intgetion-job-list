import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SHELL_NAMESPACES } from "./client-messages";

/**
 * D476: the layout sends only the shell namespaces to the browser. Every
 * page whose client components read another namespace must add it with
 * `<RouteMessages namespaces={[...]}>`. This walks the import graph from each
 * "use client" file that calls `useTranslations("x")` up to the app/ files
 * that render it and checks that each of them provides "x".
 */
const SRC = path.resolve(__dirname, "..");
const EXTS = [".tsx", ".ts", "/index.tsx", "/index.ts"];
const ENTRY = /[\\/]app[\\/].*(page|layout|template|error|not-found)\.tsx$/;

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") sourceFiles(full, out);
    } else if (
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      out.push(full);
    }
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return null;
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  for (const ext of EXTS) if (fs.existsSync(base + ext)) return base + ext;
  return null;
}

function arrayLiteral(text: string, pattern: RegExp): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(pattern)) {
    for (const item of match[1].matchAll(/"([^"]+)"/g)) out.push(item[1]);
  }
  return out;
}

const files = sourceFiles(SRC);
const text = new Map(
  files.map((file) => [file, fs.readFileSync(file, "utf8")]),
);
const importers = new Map<string, Set<string>>();
for (const [file, body] of text) {
  const specs = body.matchAll(
    /(?:import|export)[^"';]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g,
  );
  for (const match of specs) {
    const target = resolveImport(file, match[1] ?? match[2]);
    if (!target) continue;
    if (!importers.has(target)) importers.set(target, new Set());
    importers.get(target)!.add(file);
  }
}

const adminLayout = path.join(SRC, "app", "(admin)", "[locale]", "layout.tsx");
const adminShell = arrayLiteral(
  text.get(adminLayout) ?? "",
  /CLIENT_NAMESPACES\s*=\s*\[([^\]]*)\]/g,
);

/**
 * A client part of the layout that loads its own namespaces in the browser
 * (`FetchedMessages`, D525) provides them to what it renders, like a page's
 * RouteMessages: the walk up stops there.
 */
const FETCHED = /<FetchedMessages\s+namespaces=\{\[([^\]]*)\]\}/g;

function isBoundary(file: string): boolean {
  return arrayLiteral(text.get(file) ?? "", FETCHED).length > 0;
}

function provided(entry: string): Set<string> {
  const own = [
    ...arrayLiteral(
      text.get(entry) ?? "",
      /<RouteMessages\s+namespaces=\{\[([^\]]*)\]\}/g,
    ),
    ...arrayLiteral(text.get(entry) ?? "", FETCHED),
  ];
  const shell = entry.includes(`${path.sep}(admin)${path.sep}`)
    ? adminShell
    : SHELL_NAMESPACES;
  return new Set([...shell, ...own]);
}

function entriesReaching(file: string): string[] {
  const seen = new Set([file]);
  const stack = [file];
  const entries: string[] = [];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (ENTRY.test(current)) entries.push(current);
    if (current !== file && isBoundary(current)) {
      entries.push(current);
      continue;
    }
    for (const next of importers.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return entries;
}

describe("client message namespaces (D476)", () => {
  it("the shell keeps what the layout's own client components read", () => {
    // error.tsx reads `error.*` through the root translator.
    expect(SHELL_NAMESPACES).toContain("error");
    expect(adminShell.length).toBeGreaterThan(0);
  });

  it("every page provides the namespaces its client components read", () => {
    const missing: string[] = [];
    for (const [file, body] of text) {
      if (!/^\s*["']use client["']/.test(body)) continue;
      const namespaces = new Set(
        [...body.matchAll(/useTranslations\(\s*"([^"]+)"\s*\)/g)].map(
          (match) => match[1].split(".")[0],
        ),
      );
      if (namespaces.size === 0) continue;
      for (const entry of entriesReaching(file)) {
        const has = provided(entry);
        for (const namespace of namespaces) {
          if (!has.has(namespace)) {
            missing.push(
              `${path.relative(SRC, entry)} needs "${namespace}" for ${path.relative(SRC, file)}`,
            );
          }
        }
      }
    }
    expect(missing.sort()).toEqual([]);
  });

  it("client code never asks for a namespace through a variable", () => {
    const dynamic: string[] = [];
    for (const [file, body] of text) {
      if (!/^\s*["']use client["']/.test(body)) continue;
      if (/useTranslations\(\s*[^)"\s]/.test(body)) {
        dynamic.push(path.relative(SRC, file));
      }
    }
    expect(dynamic).toEqual([]);
  });
});
