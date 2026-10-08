import { describe, expect, it } from "vitest";
import { systemPrompt } from "../prompts/system";
import { countryFromText, countryToIso } from "../service/country";
import {
  catalogSkillSlug,
  draftFromExtraction,
  type Extraction,
} from "../service/extract";
import {
  followUp,
  mergeDraft,
  nextSlot,
  rememberUtterance,
  searchFiltersFromDraft,
} from "../service/memory";

describe("Spoki memory", () => {
  it("reads Italy from a short answer and does not ask the country again", () => {
    expect(countryToIso("IT")).toBe("IT");
    expect(countryToIso("Italy")).toBe("IT");
    expect(countryToIso("Italia")).toBe("IT");
    expect(countryToIso("Италия")).toBe("IT");
    expect(countryToIso("в Италии")).toBe("IT");
    expect(countryFromText("В Италии")).toBe("IT");

    const draft = rememberUtterance(undefined, "В Италии");
    expect(draft.country).toBe("IT");
    expect(nextSlot(draft)).toBe("role");
    expect(followUp("ru", draft)).toContain("Италия");
    expect(followUp("ru", draft)).not.toContain("В какой стране");
  });

  it("keeps Italy when a later answer adds the role", () => {
    const first = rememberUtterance(undefined, "В Италии");
    const next = mergeDraft(first, { desiredTitles: ["customer support"] });
    expect(next.country).toBe("IT");
    expect(next.desiredTitles).toEqual(["customer support"]);
    expect(nextSlot(next)).not.toBe("country");
  });

  it("takes the country where the person lives, not a demonym", () => {
    const text =
      "Я украинец, сейчас живу в Италии, хочу удалённую работу в customer support";
    const draft = rememberUtterance(undefined, text);
    expect(draft.country).toBe("IT");
    expect(draft.workFormats).toEqual(["remote"]);
  });

  it("puts a long answer into several profile fields at once", async () => {
    const extracted: Extraction = {
      country: "Италии",
      desiredTitles: ["customer support"],
      workFormats: ["remote"],
      languages: [
        { lang: "en", level: "B1" },
        { lang: "de", level: "A2" },
      ],
      salaryMinMinor: 150000,
      salaryCurrency: "EUR",
      salaryPeriod: "month",
      salaryBasis: "net",
      notes: "driving licence",
    };
    const { patch, notes } = await draftFromExtraction(
      extracted,
      catalogSkillSlug,
    );
    expect(patch?.country).toBe("IT");
    expect(patch?.desiredTitles).toEqual(["customer support"]);
    expect(patch?.workFormats).toEqual(["remote"]);
    expect(patch?.languages).toEqual([
      { lang: "en", level: "B1" },
      { lang: "de", level: "A2" },
    ]);
    expect(patch?.salaryMin).toBe("150000");
    expect(patch?.salaryCurrency).toBe("EUR");
    expect(notes).toBe("driving licence");
    expect(nextSlot(mergeDraft(undefined, patch ?? {}))).not.toBe("country");
  });

  it("tells Spoki the known profile in the prompt", () => {
    const prompt = systemPrompt({
      locale: "ru",
      signedIn: false,
      draft: { country: "IT" },
    });
    expect(prompt).toContain("Spoki Assistant");
    expect(prompt).toContain('"country":"IT"');
    expect(prompt).toContain("about: role");
    expect(prompt).not.toContain("about: country");
    expect(prompt).toContain("Never promise employment");
    expect(prompt).toContain("ROUTES");
    expect(prompt).toContain("post_job");
    expect(prompt).not.toContain("only when they ask");
  });

  it("does not filter remote search by the country of residence", () => {
    expect(
      searchFiltersFromDraft({
        country: "IT",
        desiredTitles: ["customer support"],
        workFormats: ["remote"],
      }),
    ).toEqual({
      q: "customer support",
      workFormat: "remote",
      country: undefined,
    });
    expect(
      searchFiltersFromDraft({
        country: "IT",
        workFormats: ["onsite"],
      }).country,
    ).toBe("IT");
  });
});
