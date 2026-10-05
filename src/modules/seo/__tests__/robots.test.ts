import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { BLOCKED_CRAWLERS, SCRAPER_TRAP_PATH } from "../site";

describe("robots.txt against scrapers (D218)", () => {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];

  it("refuses SEO-tool crawlers the whole site", () => {
    const blocked = list.find((rule) => rule.disallow === "/");
    expect(blocked?.userAgent).toEqual([...BLOCKED_CRAWLERS]);
  });

  it("never blocks search engines", () => {
    const agents = list.flatMap((rule) =>
      Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent],
    );
    for (const engine of ["Googlebot", "Bingbot", "YandexBot"]) {
      expect(agents).not.toContain(engine);
    }
  });

  it("tells every crawler to skip the scraper trap", () => {
    const everyone = list.find((rule) => rule.userAgent === "*");
    const disallowed = [everyone?.disallow ?? []].flat();
    expect(
      disallowed.some((prefix) => SCRAPER_TRAP_PATH.startsWith(prefix)),
    ).toBe(true);
  });
});
