import { describe, expect, it } from "vitest";
import { buildLegal, splitLegal } from "../../../scripts/legal-sync.mjs";
import { LEGAL_DETAILS } from "@/config/legal";
import { headingId, parseLegal } from "@/components/legal/parse";
import legal from "./legal.json";
import { legalText } from "./index";

describe("legal texts (D241)", () => {
  it("builds identical legal content from Windows and Unix line endings", () => {
    const source = "# Условия\n\nТекст.\n<!-- en -->\n# Terms\n\nText.\n";
    expect(splitLegal(source.replaceAll("\n", "\r\n"))).toEqual(
      splitLegal(source),
    );
  });
  it("match docs/content/legal-*.md — run pnpm legal:sync after editing", () => {
    expect(buildLegal(process.cwd())).toEqual(legal);
  });

  it("use only placeholders that the config knows", () => {
    const used = new Set(
      [legal.terms, legal.privacy]
        .flatMap((doc) => Object.values(doc))
        .flatMap((text) => [...text.matchAll(/\{\{(\w+)\}\}/g)])
        .map((match) => match[1]),
    );
    for (const key of used) expect(Object.keys(LEGAL_DETAILS)).toContain(key);
  });

  it("parses headings, lists, tables and paragraphs", () => {
    const blocks = parseLegal(
      "# Title\n\n## 5. Cookies\n\n- one\n- two\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\nText\nmore.",
    );
    expect(blocks.map((block) => block.kind)).toEqual([
      "heading",
      "heading",
      "list",
      "table",
      "paragraph",
    ]);
    expect(blocks[3]).toEqual({
      kind: "table",
      head: ["a", "b"],
      rows: [["1", "2"]],
    });
    expect(headingId("5. Cookies and similar technologies")).toBe("cookies");
    expect(headingId("5. Куки и похожие технологии")).toBe("cookies");
    expect(headingId("3.2 Профиль кандидата")).toBe("s3-2");
  });

  it("has a cookie section in every language of the privacy policy", () => {
    expect(legal.privacy.ru).toContain("## 5. Куки");
    expect(legal.privacy.en).toContain("## 5. Cookies");
    expect(legal.privacy["pt-BR"]).toContain("## 5. Cookies");
    expect(legal.privacy.es).toContain("## 5. Cookies");
    expect(legal.privacy.de).toContain("## 5. Cookies");
    expect(legal.privacy.fr).toContain("## 5. Cookies");
    expect(legal.privacy.it).toContain("## 5. Cookie");
  });

  it("gives ru, pt-BR, es, de, fr and it their own text and every other language English (D350)", () => {
    expect(legalText("terms", "pt-BR")).toBe(legal.terms["pt-BR"]);
    expect(legalText("terms", "ru")).toBe(legal.terms.ru);
    expect(legalText("terms", "es")).toBe(legal.terms.es);
    expect(legalText("privacy", "es")).toBe(legal.privacy.es);
    expect(legalText("terms", "de")).toBe(legal.terms.de);
    expect(legalText("privacy", "de")).toBe(legal.privacy.de);
    expect(legalText("terms", "fr")).toBe(legal.terms.fr);
    expect(legalText("privacy", "fr")).toBe(legal.privacy.fr);
    expect(legalText("terms", "it")).toBe(legal.terms.it);
    expect(legalText("privacy", "it")).toBe(legal.privacy.it);
    expect(legalText("terms", "nl")).toBe(legal.terms.en);
    expect(legal.terms["pt-BR"]).toContain("/pt-BR/privacy");
    expect(legal.terms.es).toContain("/es/privacy");
    expect(legal.terms.de).toContain("/de/privacy");
    expect(legal.terms.fr).toContain("/fr/privacy");
    expect(legal.terms.it).toContain("/it/privacy");
    for (const doc of [legal.terms, legal.privacy]) {
      expect(doc.es).not.toBe(doc.en);
      expect(doc.es).not.toContain("/en/");
      expect(doc.es.match(/\{\{\w+\}\}/g)).toEqual(
        doc.en.match(/\{\{\w+\}\}/g),
      );
    }
    expect(legal.terms.es).toContain("10.5.");
  });

  it("de, fr and it are full translations with the same placeholders as en (D373, D374, D379)", () => {
    const placeholders = (text: string) => text.match(/\{\{\w+\}\}/g);
    for (const document of [legal.terms, legal.privacy]) {
      expect(placeholders(document.en)?.length).toBeGreaterThan(0);
      for (const text of [document.de, document.fr, document.it]) {
        expect(text).not.toBe(document.en);
        expect(text).not.toContain("/en/");
        expect(placeholders(text)).toEqual(placeholders(document.en));
        expect(text.match(/^## /gm)?.length).toBe(
          document.en.match(/^## /gm)?.length,
        );
      }
    }
    expect(legal.terms.de).toContain("10.5.");
    expect(legal.terms.fr).toContain("10.5.");
    expect(legal.terms.it).toContain("10.5.");
  });
});
