import { describe, expect, it } from "vitest";
import {
  mergeBriefPatch,
  missingBriefFields,
  normalizedLanguages,
  isExplicitBriefConfirmation,
  isExplicitDraftReset,
  unconfirmedBriefRanges,
} from "../service/drafts";

describe("shared UGC brief draft", () => {
  it("merges only supplied values and treats null as no change", () => {
    expect(
      mergeBriefPatch(
        { productName: "Shop", goal: "purchases" },
        {
          productName: null,
          audience: "Women",
        },
      ),
    ).toEqual({ productName: "Shop", goal: "purchases", audience: "Women" });
  });

  it("normalizes written language names to ISO-639-1 codes", () => {
    expect(
      normalizedLanguages([
        "Italian",
        "Spanish",
        "Russian",
        "German",
        "English",
      ]),
    ).toEqual(["it", "es", "ru", "de", "en"]);
  });

  it("accepts a country list instead of an audience, but asks for a location if both are absent", () => {
    const base = {
      productName: "Intgetion",
      description: "Lingerie and pajamas",
      goal: "purchases",
      platform: "reels",
      videoCount: 6,
      rewardCents: 6000,
      deadline: "2099-11-29",
      rights: "ads",
    };
    expect(
      missingBriefFields({ ...base, countries: ["IT", "ES", "DE"] }),
    ).toEqual([]);
    expect(missingBriefFields(base)).toContain("audienceOrCountry");
  });

  it("keeps ranges and out-of-range amounts incomplete", () => {
    expect(missingBriefFields({ videoCount: 5.5, rewardCents: 60000 })).toEqual(
      expect.arrayContaining(["videoCount", "rewardCents"]),
    );
  });

  it("requires an affirmative confirmation and blocks negative wording", () => {
    expect(isExplicitBriefConfirmation("Да, запускай бриф на 6 роликов")).toBe(
      true,
    );
    expect(isExplicitBriefConfirmation("Запускай")).toBe(true);
    expect(isExplicitBriefConfirmation("Нет, не запускай")).toBe(false);
  });

  it("recognizes a new product as a request to reset the draft", () => {
    expect(isExplicitDraftReset("Теперь магазин, не приложение")).toBe(true);
    expect(isExplicitDraftReset("Давай другую цену")).toBe(false);
  });

  it("does not save a video or price range until the user agrees to the midpoint", () => {
    expect(
      unconfirmedBriefRanges("5–7 видео, 50–80 долларов за каждое", {
        videoCount: 6,
        rewardCents: 6500,
      }),
    ).toEqual([
      { field: "videoCount", low: 5, high: 7, proposal: 6 },
      { field: "rewardCents", low: 5000, high: 8000, proposal: 6500 },
    ]);
    expect(
      unconfirmedBriefRanges("5–7 видео, ставь 6; $50–$80, бери $65", {
        videoCount: 6,
        rewardCents: 6500,
      }),
    ).toEqual([]);
  });
});
