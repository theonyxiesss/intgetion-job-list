import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import en from "./en.json";
import es from "./es.json";
import de from "./de.json";
import fr from "./fr.json";
import itMessages from "./it.json";
import ptBR from "./pt-BR.json";
import ru from "./ru.json";

const catalogs = { en, ru, es, "pt-BR": ptBR, de, fr, it: itMessages } as const;

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
  it("keeps the company story in English only (D404)", () => {
    expect(en.companyMarketing.metaTitle).toContain("INTGETION");
    for (const [locale, catalog] of Object.entries(catalogs)) {
      if (locale === "en") continue;
      expect(catalog).not.toHaveProperty("companyMarketing");
    }
  });

  it("has a catalog for every routed locale (D336)", () => {
    expect(Object.keys(catalogs).sort()).toEqual([...routing.locales].sort());
  });

  for (const [locale, catalog] of Object.entries(catalogs)) {
    it(`${locale}: keeps the product name and the same keys as en`, () => {
      expect(catalog.product.name).toBe("INTGETION JOB LIST");
      const skipCompany = (key: string) =>
        locale !== "en" &&
        (key === "companyMarketing" || key.startsWith("companyMarketing."));
      expect(
        entries(catalog)
          .map(([key]) => key)
          .filter((key) => !skipCompany(key))
          .sort(),
      ).toEqual(
        entries(en)
          .map(([key]) => key)
          .filter((key) => !skipCompany(key))
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
