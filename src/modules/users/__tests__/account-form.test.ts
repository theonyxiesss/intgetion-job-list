import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sharedProfileInput } from "../service";
import { formatLanguages, parseLanguages } from "../ui/languages";

describe("account page form (D504)", () => {
  it("reads languages typed as one line", () => {
    expect(parseLanguages("en C1, RU native,  de")).toEqual([
      { code: "en", level: "C1" },
      { code: "ru", level: "native" },
      { code: "de", level: null },
    ]);
    expect(parseLanguages("")).toEqual([]);
    expect(parseLanguages("en c1, en B2")).toEqual([
      { code: "en", level: "C1" },
    ]);
    expect(parseLanguages("english C1")).toBeNull();
    expect(parseLanguages("en fluent")).toBeNull();
    expect(parseLanguages("en C1 extra")).toBeNull();
  });

  it("writes them back the same way", () => {
    const line = "en C1, ru native, de";
    expect(formatLanguages(parseLanguages(line)!)).toBe(line);
  });

  it("accepts the form, clears empty text and refuses bad values", () => {
    expect(
      sharedProfileInput.parse({
        displayName: " Anna ",
        country: "pl",
        city: "",
        timezone: "Europe/Warsaw",
        languages: [{ code: "EN", level: "C1" }],
        about: "",
      }),
    ).toEqual({
      displayName: "Anna",
      country: "PL",
      city: null,
      timezone: "Europe/Warsaw",
      languages: [{ code: "en", level: "C1" }],
      about: null,
    });
    const base = {
      displayName: null,
      country: null,
      city: null,
      timezone: null,
      languages: [],
      about: null,
    };
    expect(
      sharedProfileInput.safeParse({ ...base, country: "Poland" }).success,
    ).toBe(false);
    expect(
      sharedProfileInput.safeParse({ ...base, timezone: "Mars/Olympus" })
        .success,
    ).toBe(false);
    expect(
      sharedProfileInput.safeParse({
        ...base,
        languages: [{ code: "en", level: "fluent" }],
      }).success,
    ).toBe(false);
    expect(
      sharedProfileInput.safeParse({ ...base, email: "a@b.c" }).success,
    ).toBe(false);
  });

  it("keeps the account page out of search and in the menus", () => {
    const site = readFileSync(
      join(process.cwd(), "src/modules/seo/site.ts"),
      "utf8",
    );
    expect(site).toContain('"/*/account"');
    const header = readFileSync(
      join(process.cwd(), "src/components/shell/header.tsx"),
      "utf8",
    );
    expect(header.match(/href: "\/account"/g)).toHaveLength(2);
  });

  it("does not overwrite a creator nickname from the account page", () => {
    const route = readFileSync(
      join(process.cwd(), "src/modules/users/service/shared-profile.ts"),
      "utf8",
    );
    const creator = route.slice(
      route.indexOf("ugc.applySharedToCreator(userId"),
    );
    expect(creator.slice(0, creator.indexOf("}),"))).not.toContain(
      "displayName",
    );
  });
});
