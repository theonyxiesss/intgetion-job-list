import { describe, expect, it } from "vitest";
import { NAV_ICONS, iconForNav } from "./nav-icons";

/** Every href Header can put in the phone menu. */
const MENU_HREFS = [
  "/jobs",
  "/matches",
  "/pricing",
  "/employer/jobs",
  "/employer/company",
  "/employer/billing",
  "/chat",
  "/post-job",
  "/for-employers",
  "/notifications",
  "/applications",
  "/saved-jobs",
  "/profile",
  "/settings/account",
  "/admin",
  "/admin/metrics",
  "/login",
] as const;

describe("phone menu icons", () => {
  it("gives every menu destination its own icon", () => {
    expect(Object.keys(NAV_ICONS).sort()).toEqual([...MENU_HREFS].sort());
    const marks = MENU_HREFS.map((href) => iconForNav(href));
    for (const mark of marks) {
      expect(typeof mark).toBe("function");
    }
    expect(new Set(marks).size).toBe(MENU_HREFS.length);
  });

  it("leaves an unknown destination without an icon", () => {
    expect(iconForNav("/register")).toBeUndefined();
  });
});
