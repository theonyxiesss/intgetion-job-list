import { describe, expect, it } from "vitest";
import { catalogTag } from "@/config/markers";
import { TAG_INTROS, tagIntro } from "./tag-intros";

const words = (text: string) => text.trim().split(/\s+/).length;

describe("collection intro texts (D299)", () => {
  it("is written for pages that exist", () => {
    for (const slug of Object.keys(TAG_INTROS)) {
      expect(catalogTag(slug), slug).not.toBeNull();
    }
  });

  it("keeps every text between 100 and 200 words in both languages", () => {
    for (const [slug, intro] of Object.entries(TAG_INTROS)) {
      for (const [locale, text] of Object.entries(intro)) {
        expect(words(text), `${slug}.${locale}`).toBeGreaterThanOrEqual(100);
        expect(words(text), `${slug}.${locale}`).toBeLessThanOrEqual(200);
      }
    }
  });

  it("does not repeat one text across collections", () => {
    const texts = Object.values(TAG_INTROS).flatMap((intro) => [
      intro.en,
      intro.ru,
    ]);
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("answers per language and admits when a collection has none", () => {
    expect(tagIntro("web3", "ru")).toBe(TAG_INTROS.web3.ru);
    expect(tagIntro("web3", "en")).toBe(TAG_INTROS.web3.en);
    expect(tagIntro("hr", "en")).toBeNull();
  });
});
