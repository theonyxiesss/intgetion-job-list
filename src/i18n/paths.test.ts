import { describe, expect, it } from "vitest";
import { isSiteHome } from "./paths";

describe("isSiteHome", () => {
  it("is the home page in every locale and nowhere else", () => {
    expect(isSiteHome("/")).toBe(true);
    expect(isSiteHome("/ru")).toBe(true);
    expect(isSiteHome("/pt-BR/")).toBe(true);
    expect(isSiteHome("/en")).toBe(true);
    expect(isSiteHome("/ru/jobs")).toBe(false);
    expect(isSiteHome("/events")).toBe(false);
    expect(isSiteHome("/ru/events")).toBe(false);
  });
});
