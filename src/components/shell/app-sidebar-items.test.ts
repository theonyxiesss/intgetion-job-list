import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import {
  groupActive,
  isGroup,
  sidebarActive,
  sidebarItems,
  sidebarLabelKeys,
} from "./app-sidebar-items";

function lookup(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) => (node as Record<string, unknown> | undefined)?.[part],
      en,
    );
}

describe("v2 side menu", () => {
  it("has an English label for every key it uses", () => {
    for (const key of sidebarLabelKeys()) {
      expect(typeof lookup(key), key).toBe("string");
    }
  });

  it("marks a section and the pages inside it as active", () => {
    expect(sidebarActive("/jobs", "/jobs")).toBe(true);
    expect(sidebarActive("/jobs/123", "/jobs")).toBe(true);
    expect(sidebarActive("/jobsearch", "/jobs")).toBe(false);
  });

  it("opens a group on any of its pages", () => {
    const finance = sidebarItems.find((item) => item.label === "nav.finance");
    expect(finance && isGroup(finance)).toBe(true);
    if (finance && isGroup(finance)) {
      expect(groupActive("/billing/crypto", finance)).toBe(true);
      expect(groupActive("/jobs", finance)).toBe(false);
    }
  });

  it("links only to absolute routes", () => {
    for (const item of sidebarItems) {
      expect(item.href.startsWith("/")).toBe(true);
      if (isGroup(item))
        for (const child of item.children)
          expect(child.href.startsWith("/")).toBe(true);
    }
  });
});
