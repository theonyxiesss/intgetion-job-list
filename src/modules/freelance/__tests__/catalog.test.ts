import { describe, expect, it } from "vitest";
import { formatMinor } from "@/lib/money";
import { shortName } from "@/modules/candidates/service";
import { parseFreelanceSearch } from "../schemas/search";
import { isMissingFreelanceTable } from "../service/catalog";
import { formatUsd, languageNames, utcLabel } from "../ui/format";

describe("/freelance query (28.11 C)", () => {
  it("keeps a full valid query", () => {
    expect(
      parseFreelanceSearch({
        q: " лендинг ",
        category: "development",
        budget: "500",
        days: "7",
        lang: "ru",
        sort: "cheap",
        page: "2",
      }),
    ).toEqual({
      q: "лендинг",
      category: "development",
      budget: 500,
      days: 7,
      lang: "ru",
      sort: "cheap",
      page: 2,
    });
  });

  it("drops values it does not offer and keeps the rest", () => {
    expect(
      parseFreelanceSearch({
        category: "dancing",
        budget: "300",
        days: "5",
        lang: "xx",
        sort: "random",
        page: "0",
        q: "seo",
      }),
    ).toEqual({ q: "seo", sort: "fit", page: 1 });
  });

  it("reads the first of repeated parameters and blanks as nothing", () => {
    expect(
      parseFreelanceSearch({ category: ["design", "web3"], q: "" }),
    ).toEqual({
      category: "design",
      sort: "fit",
      page: 1,
    });
  });
});

describe("prices on the page", () => {
  it("writes whole dollars without cents and keeps cents when there are some", () => {
    expect(formatUsd(BigInt(45000), "en")).toBe("$450");
    expect(formatUsd(BigInt(45050), "en")).toBe("$450.50");
    expect(formatUsd(BigInt(2000000), "en")).toBe("$20,000");
    expect(formatUsd(BigInt(45000), "ru")).toMatch(/^450\s\$$/);
  });

  it("keeps formatMinor exact for money DTOs", () => {
    expect(formatMinor(BigInt(123456), "USD", "en-US")).toBe("$1,234.56");
    expect(formatMinor(BigInt(100000), "USD", "en-US")).toBe("$1,000.00");
    expect(formatMinor(BigInt(5000), "JPY", "en-US")).toBe("¥5,000");
  });
});

describe("seller storefront (D448)", () => {
  it("shows the first name and one initial", () => {
    expect(shortName("Ada Lovelace")).toBe("Ada L.");
    expect(shortName("  Алина   Кравец ")).toBe("Алина К.");
    expect(shortName("Jean-Luc de la Fontaine")).toBe("Jean-Luc F.");
    expect(shortName("Ada")).toBe("Ada");
    expect(shortName("   ")).toBeNull();
    expect(shortName(null)).toBeNull();
  });

  it("writes the zone as an offset", () => {
    const winter = new Date("2026-01-15T12:00:00.000Z");
    expect(utcLabel("Europe/Moscow", winter)).toBe("UTC+3");
    expect(utcLabel("America/New_York", winter)).toBe("UTC−5");
    expect(utcLabel("Asia/Kolkata", winter)).toBe("UTC+5:30");
    expect(utcLabel("UTC", winter)).toBe("UTC");
    expect(utcLabel("Not/AZone", winter)).toBe("Not/AZone");
  });

  it("names work languages in the reader's language", () => {
    expect(languageNames(["ru", "en"], "en")).toBe("Russian, English");
  });
});

describe("missing tables", () => {
  it("treats a freelance table that is not there yet as an empty catalog", () => {
    expect(isMissingFreelanceTable({ code: "42P01" })).toBe(true);
    expect(
      isMissingFreelanceTable(
        new Error("query failed", {
          cause: new Error('relation "freelance_services" does not exist'),
        }),
      ),
    ).toBe(true);
    expect(isMissingFreelanceTable(new Error("timeout"))).toBe(false);
  });
});
