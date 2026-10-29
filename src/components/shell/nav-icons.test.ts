import { describe, expect, it } from "vitest";
import { NAV_ICONS, iconForNav, orderPhoneNav } from "./nav-icons";

/** Every href Header can put in the phone menu. */
const MENU_HREFS = [
  "/account",
  "/jobs",
  "/events",
  "/freelance",
  "/freelance/tasks",
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
  it("gives every signed-in account one order, company pages by membership (D517)", () => {
    const items = menu([
      "/login",
      "/jobs",
      "/events",
      "/freelance",
      "/freelance/tasks",
      "/campaigns",
      "/services",
      "/post-job",
      "/chat",
      "/notifications",
      "/applications",
      "/saved-jobs",
      "/account",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
    expect(orderPhoneNav(items, "member").map((item) => item.href)).toEqual([
      "/jobs",
      "/events",
      "/applications",
      "/chat",
      "/saved-jobs",
      "/notifications",
      "/account",
      "/post-job",
      "/freelance",
      "/freelance/tasks",
      "/campaigns",
      "/services",
      "/settings/account",
      "/admin",
      "/admin/metrics",
    ]);
    const member = orderPhoneNav(
      menu([
        ...items.map((item) => item.href),
        "/employer/jobs",
        "/employer/company",
      ]),
      "member",
    ).map((item) => item.href);
    expect(member.indexOf("/employer/jobs")).toBe(
      member.indexOf("/account") + 1,
    );
    expect(member).not.toContain("/profile");
  });

  it("orders a guest and skips items they do not have", () => {
    const items = menu([
      "/jobs",
      "/events",
      "/freelance",
      "/freelance/tasks",
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
      "/freelance/tasks",
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
});
