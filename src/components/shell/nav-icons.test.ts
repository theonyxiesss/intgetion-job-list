import { describe, expect, it } from "vitest";
import { NAV_ICONS, iconForNav, orderPhoneNav } from "./nav-icons";

/** Every href Header can put in the phone menu. */
const MENU_HREFS = [
  "/jobs",
  "/services",
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

function menu(hrefs: string[]) {
  return hrefs.map((href) => ({ href, label: href }));
}

describe("phone menu order", () => {
  it("orders a signed-in candidate", () => {
    const items = menu([
      "/pricing",
      "/login",
      "/jobs",
      "/services",
      "/post-job",
      "/chat",
      "/notifications",
      "/applications",
      "/saved-jobs",
      "/profile",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
    expect(orderPhoneNav(items, "candidate").map((item) => item.href)).toEqual([
      "/jobs",
      "/applications",
      "/chat",
      "/saved-jobs",
      "/notifications",
      "/profile",
      "/pricing",
      "/services",
      "/post-job",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
  });

  it("orders a guest and skips items they do not have", () => {
    const items = menu([
      "/jobs",
      "/services",
      "/pricing",
      "/post-job",
      "/chat",
      "/for-employers",
      "/login",
      "/applications",
    ]);
    expect(orderPhoneNav(items, "guest").map((item) => item.href)).toEqual([
      "/jobs",
      "/chat",
      "/pricing",
      "/services",
      "/post-job",
      "/for-employers",
      "/login",
    ]);
    expect(
      orderPhoneNav(
        menu([
          "/jobs",
          "/chat",
          "/pricing",
          "/post-job",
          "/for-employers",
          "/login",
        ]),
        "guest",
      ).map((item) => item.href),
    ).not.toContain("/services");
  });

  it("orders an employer with admin last", () => {
    const items = menu([
      "/jobs",
      "/services",
      "/employer/jobs",
      "/employer/company",
      "/employer/billing",
      "/pricing",
      "/chat",
      "/post-job",
      "/notifications",
      "/settings/account",
      "/admin",
      "/admin/metrics",
      "/profile",
    ]);
    expect(orderPhoneNav(items, "employer").map((item) => item.href)).toEqual([
      "/employer/jobs",
      "/post-job",
      "/employer/company",
      "/employer/billing",
      "/chat",
      "/jobs",
      "/services",
      "/pricing",
      "/notifications",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
  });
});
