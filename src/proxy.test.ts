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
const literal = /matcher:\s*(\[[\s\S]*?\])/.exec(source)?.[1] ?? "[]";
// Prettier leaves a trailing comma in a multi-line array; JSON has none.
const matchers = JSON.parse(literal.replace(/,\s*\]$/, "]")) as string[];
const matcher = matchers[0] ?? "";
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

  it("skips Next.js internals and files with the first pattern", () => {
    for (const route of [
      "_next/static/chunk.js",
      "favicon.ico",
      "robots.txt",
    ]) {
      expect(excluded.test(route), route).toBe(true);
    }
  });

  it("also matches robots.txt so the admin host can refuse crawlers", () => {
    expect(matchers).toContain("/robots.txt");
  });

  it("routes the English job feeds, which have no locale prefix", () => {
    // /jobs/rss.xml answered 404: the first pattern skips any path with a dot.
    expect(excluded.test("jobs/rss.xml")).toBe(true);
    expect(matchers).toContain("/jobs/rss.xml");
    expect(matchers).toContain("/jobs/t/:slug/rss.xml");
  });

  it("waits for the phone bridge before the Mini App bounce leaves", () => {
    expect(source).toContain("TELEGRAM_MINI_APP_BOUNCE_SCRIPT");
    expect(source).not.toContain("n++>=10");
  });

  it("refreshes the session on API routes before the handler runs", () => {
    const api = source.slice(source.indexOf('pathname.startsWith("/api/")'));
    const refreshAt = api.indexOf("await refreshSession(request)");
    const nextAt = api.indexOf("NextResponse.next");
    expect(refreshAt).toBeGreaterThan(0);
    expect(nextAt).toBeGreaterThan(refreshAt);
  });
});
