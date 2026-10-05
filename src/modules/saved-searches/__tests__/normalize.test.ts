import { describe, expect, it } from "vitest";
import { normalizeQuery } from "../service/saved-searches-service";

describe("saved search query (D233)", () => {
  it("drops cursor and sort and sorts the filters", () => {
    expect(
      normalizeQuery("?workFormat=remote&q=rust&cursor=abc&sort=salary"),
    ).toBe("q=rust&workFormat=remote");
  });

  it("makes the same search the same string", () => {
    expect(normalizeQuery("workFormat=remote&q=rust")).toBe(
      normalizeQuery("?q=rust&workFormat=remote"),
    );
  });

  it("refuses an empty or invalid search", () => {
    expect(normalizeQuery("")).toBeNull();
    expect(normalizeQuery("?cursor=abc")).toBeNull();
    expect(normalizeQuery("?postedWithin=5")).toBeNull();
  });
});
