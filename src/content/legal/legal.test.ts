import { describe, expect, it } from "vitest";
import { buildLegal } from "../../../scripts/legal-sync.mjs";
import { LEGAL_DETAILS } from "@/config/legal";
import { headingId, parseLegal } from "@/components/legal/parse";
import legal from "./legal.json";

describe("legal texts (D241)", () => {
  it("match docs/content/legal-*.md — run pnpm legal:sync after editing", () => {
    expect(buildLegal(process.cwd())).toEqual(legal);
  });

  it("use only placeholders that the config knows", () => {
    const used = new Set(
      [legal.terms.ru, legal.terms.en, legal.privacy.ru, legal.privacy.en]
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

  it("has a cookie section in both languages of the privacy policy", () => {
    expect(legal.privacy.ru).toContain("## 5. Куки");
    expect(legal.privacy.en).toContain("## 5. Cookies");
  });
});
