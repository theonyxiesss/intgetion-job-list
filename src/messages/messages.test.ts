import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import en from "./en.json";
import es from "./es.json";
import ptBR from "./pt-BR.json";
import ru from "./ru.json";

const catalogs = { en, ru, es, "pt-BR": ptBR } as const;

function entries(value: unknown, prefix = ""): [string, string][] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [[prefix, String(value)]];
  }
  return Object.entries(value).flatMap(([key, nested]) =>
    entries(nested, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * What a translation must carry over unchanged: `{name}` arguments, the
 * `{count, plural,` head and `<tag>` rich-text markers. Plural branches
 * themselves are translated, so their words are not compared.
 */
function tokens(text: string): string[] {
  const args = [...text.matchAll(/\{(\w+)(?=[,}])/g)].map((m) => `{${m[1]}`);
  const tags = [...text.matchAll(/<\/?(\w+)>/g)].map((m) => m[0]);
  return [...args, ...tags].sort();
}

describe("messages", () => {
  it("has a catalog for every routed locale (D336)", () => {
    expect(Object.keys(catalogs).sort()).toEqual([...routing.locales].sort());
  });

  for (const [locale, catalog] of Object.entries(catalogs)) {
    it(`${locale}: keeps the product name and the same keys as en`, () => {
      expect(catalog.product.name).toBe("INTGETION JOB LIST");
      expect(
        entries(catalog)
          .map(([key]) => key)
          .sort(),
      ).toEqual(
        entries(en)
          .map(([key]) => key)
          .sort(),
      );
    });

    it(`${locale}: keeps every placeholder and tag of en`, () => {
      const source = new Map(entries(en));
      const broken = entries(catalog)
        .filter(([key, text]) => {
          const original = source.get(key) ?? "";
          return tokens(text).join(" ") !== tokens(original).join(" ");
        })
        .map(([key]) => key);
      expect(broken).toEqual([]);
    });
  }
});
