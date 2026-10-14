import { describe, expect, it } from "vitest";
import { embedOriginForPath, isEmbeddedOrigin } from "./embedded-sites";

describe("embedOriginForPath (D400)", () => {
  it("does not frame company or portfolio in any locale", () => {
    for (const path of [
      "/company",
      "/company/",
      "/ru/company",
      "/pt-BR/company",
      "/portfolio",
      "/de/portfolio",
      "/it/portfolio/",
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

  it("does not allow the retired site origins", () => {
    expect(isEmbeddedOrigin("https://intgetion.vercel.app")).toBe(false);
    expect(isEmbeddedOrigin("https://theonyxis.vercel.app")).toBe(false);
    expect(isEmbeddedOrigin("https://evil.example")).toBe(false);
  });
});
