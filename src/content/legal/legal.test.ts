import { describe, expect, it } from "vitest";
import { buildLegal } from "../../../scripts/legal-sync.mjs";
import { LEGAL_DETAILS } from "@/config/legal";
import { headingId, parseLegal } from "@/components/legal/parse";
import legal from "./legal.json";
import { legalText } from "./index";

describe("legal texts (D241)", () => {
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
  });

  it("gives pt-BR its own text and every other language English (D350)", () => {
    expect(legalText("terms", "pt-BR")).toBe(legal.terms["pt-BR"]);
    expect(legalText("terms", "ru")).toBe(legal.terms.ru);
    expect(legalText("terms", "es")).toBe(legal.terms.en);
    expect(legal.terms["pt-BR"]).toContain("/pt-BR/privacy");
  });
});
