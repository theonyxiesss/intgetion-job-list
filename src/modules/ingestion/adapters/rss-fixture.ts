import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ImportAdapter, RawImportedJob } from "./types";

function field(item: string, name: string): string {
  const match = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i"));
  return match?.[1]?.trim() ?? "";
}

export function parseFixtureRss(xml: string): RawImportedJob[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].map(([, item]) => {
    const domain = field(item, "domain");
    return {
      externalId: field(item, "guid"),
      companyName: field(item, "company"),
      companyDomain: domain || null,
      title: field(item, "title"),
      description: field(item, "description"),
      category: field(item, "category"),
      skills: field(item, "skills")
        .split(",")
        .map((skill) => skill.trim())
        .filter(Boolean),
      applyUrl: field(item, "link"),
      expiresAt: field(item, "expires") || null,
    };
  });
}

export const rssFixtureAdapter: ImportAdapter = {
  sourceName: "Fictional RSS Feed",
  kind: "rss",
  async loadFixture() {
    const path = join(process.cwd(), "fixtures/import/fictional-rss/feed.xml");
    return parseFixtureRss(await readFile(path, "utf8"));
  },
};
