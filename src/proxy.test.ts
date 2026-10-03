import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Next.js reads the matcher statically, so the test reads the same literal.
// 1A shipped "\." in a plain string, which is just "."; the lookahead then
// excluded every path but "/", so the proxy never ran.
const source = fs.readFileSync(
  path.join(process.cwd(), "src/proxy.ts"),
  "utf8",
);
const literal = /matcher:\s*("(?:[^"\\]|\\.)*")/.exec(source)?.[1] ?? '""';
const matcher = JSON.parse(literal) as string;
const lookahead = /^\/\(\(\?!(.*)\)\.\*\)$/.exec(matcher)?.[1] ?? "";
const excluded = new RegExp(`^(?:${lookahead})`);

describe("proxy matcher", () => {
  it("is a lookahead pattern", () => {
    expect(lookahead).not.toBe("");
  });

  it("runs on pages and API routes", () => {
    for (const route of ["en", "ru/login", "api/auth/login", "api/me"]) {
      expect(excluded.test(route), route).toBe(false);
    }
  });

  it("skips Next.js internals and files", () => {
    for (const route of [
      "_next/static/chunk.js",
      "favicon.ico",
      "robots.txt",
    ]) {
      expect(excluded.test(route), route).toBe(true);
    }
  });
});
