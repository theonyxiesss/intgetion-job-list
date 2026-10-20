import { describe, expect, it } from "vitest";
import { NAV_ICONS, iconForNav, orderPhoneNav } from "./nav-icons";

/** Every href Header can put in the phone menu. */
const MENU_HREFS = [
  "/account",
  "/jobs",
  "/events",
  "/freelance",
  "/campaigns",
  "/services",
  "/matches",
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
      "/login",
      "/jobs",
      "/events",
      "/freelance",
      "/campaigns",
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
      "/events",
      "/applications",
      "/chat",
      "/saved-jobs",
      "/notifications",
      "/profile",
      "/freelance",
      "/campaigns",
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
      "/events",
      "/freelance",
      "/campaigns",
      "/services",
      "/post-job",
      "/chat",
      "/for-employers",
      "/login",
      "/applications",
    ]);
    expect(orderPhoneNav(items, "guest").map((item) => item.href)).toEqual([
      "/jobs",
      "/events",
      "/chat",
      "/freelance",
      "/campaigns",
      "/services",
      "/post-job",
      "/for-employers",
      "/login",
    ]);
    expect(
      orderPhoneNav(
        menu(["/jobs", "/chat", "/post-job", "/for-employers", "/login"]),
        "guest",
      ).map((item) => item.href),
    ).not.toContain("/services");
  });

  it("orders an employer with admin last", () => {
    const items = menu([
      "/jobs",
      "/events",
      "/services",
      "/employer/jobs",
      "/employer/company",
      "/employer/billing",
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
      "/events",
      "/services",
      "/notifications",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
  });
});
