import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { embedOriginForPath, EMBEDDED_SITES, PREFIXED_LOCALES } from "./embedded-sites";

describe("embedOriginForPath (D388)", () => {
  it("allows the company and portfolio pages in every locale", () => {
    expect(embedOriginForPath("/company")).toBe(EMBEDDED_SITES.company);
    expect(embedOriginForPath("/company/")).toBe(EMBEDDED_SITES.company);
    expect(embedOriginForPath("/ru/company")).toBe(EMBEDDED_SITES.company);
    expect(embedOriginForPath("/pt-BR/company")).toBe(EMBEDDED_SITES.company);
    expect(embedOriginForPath("/portfolio")).toBe(EMBEDDED_SITES.portfolio);
    expect(embedOriginForPath("/de/portfolio")).toBe(EMBEDDED_SITES.portfolio);
    expect(embedOriginForPath("/it/portfolio/")).toBe(EMBEDDED_SITES.portfolio);
  });

  it("keeps the same prefixed locales as the site", () => {
    expect([...PREFIXED_LOCALES]).toEqual(
      routing.locales.filter((locale) => locale !== routing.defaultLocale),
    );
  });

  it("does not open a frame on any other path", () => {
    for (const path of [
      "/",
      "/jobs",
      "/company-extra",
      "/portfolio/secret",
      "/ru",
      "/ru/jobs",
      "/en/company",
    ]) {
      expect(embedOriginForPath(path), path).toBeUndefined();
    }
  });
});
