import { describe, expect, it } from "vitest";
import { dockHiddenOnHome } from "./spoki-dock-home";

describe("dockHiddenOnHome", () => {
  it("hides the docked panel on the v2 home page", () => {
    expect(dockHiddenOnHome(true, "/", "docked")).toBe(true);
  });

  it("keeps a panel the person opened on the home page", () => {
    expect(dockHiddenOnHome(true, "/", "sheet")).toBe(false);
    expect(dockHiddenOnHome(true, "/", "expanded")).toBe(false);
  });

  it("keeps the panel on other pages", () => {
    expect(dockHiddenOnHome(true, "/jobs", "docked")).toBe(false);
  });

  it("changes nothing without UI 2.0", () => {
    expect(dockHiddenOnHome(false, "/", "docked")).toBe(false);
  });
});
