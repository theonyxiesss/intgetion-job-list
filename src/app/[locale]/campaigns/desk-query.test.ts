import { describe, expect, it } from "vitest";
import { deskPath, listHref, paginate } from "./desk-query";

describe("desk addresses (U2, TZ 48 §4)", () => {
  it("keeps defaults out of the address", () => {
    expect(listHref({ view: "active" })).toBe("/campaigns/list");
    expect(
      deskPath("/campaigns/orders", {
        view: "applied",
        defaultView: "applied",
      }),
    ).toBe("/campaigns/orders");
    expect(deskPath("/campaigns/payments", { page: 1 })).toBe(
      "/campaigns/payments",
    );
  });

  it("carries the company, the view and the page together", () => {
    expect(
      deskPath("/campaigns/orders", {
        view: "done",
        defaultView: "applied",
        company: "c1",
        page: 3,
      }),
    ).toBe("/campaigns/orders?view=done&company=c1&page=3");
    expect(
      listHref({ view: "closed", company: "c1", q: "mango", page: 2 }),
    ).toBe("/campaigns/list?view=closed&company=c1&q=mango&page=2");
  });

  it("encodes a search word", () => {
    expect(listHref({ view: "active", q: "a&b c" })).toBe(
      "/campaigns/list?q=a%26b+c",
    );
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);

  it("slices a page and counts pages", () => {
    expect(paginate(items, 1, 10)).toMatchObject({
      page: 1,
      pages: 3,
      total: 25,
    });
    expect(paginate(items, 3, 10).items).toEqual([20, 21, 22, 23, 24]);
  });

  it("moves a page past the end or below one to the nearest real page", () => {
    expect(paginate(items, 99, 10).page).toBe(3);
    expect(paginate(items, 0, 10).page).toBe(1);
    expect(paginate(items, -4, 10).page).toBe(1);
    expect(paginate(items, Number.NaN, 10).page).toBe(1);
  });

  it("gives one empty page for an empty list", () => {
    expect(paginate([], 5)).toEqual({ items: [], page: 1, pages: 1, total: 0 });
  });
});
