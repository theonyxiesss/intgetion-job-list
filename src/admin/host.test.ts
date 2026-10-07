import { describe, expect, it } from "vitest";
import {
  adminHostEntry,
  adminPathStatus,
  csrfSite,
  hostOrigin,
  isAdminHost,
  isAdminSurface,
} from "./host";

describe("admin host routing", () => {
  it("recognises the production and local admin hosts", () => {
    expect(isAdminHost("admin.intgetion.com")).toBe(true);
    expect(isAdminHost("admin.localhost:3000")).toBe(true);
    expect(isAdminHost("intgetion.com")).toBe(false);
    expect(isAdminHost("127.0.0.1:3000")).toBe(false);
  });

  it("keeps /admin on the main host until the flag is on", () => {
    expect(
      adminPathStatus({
        host: "127.0.0.1:3000",
        pathname: "/en/admin",
        hostOnly: false,
      }),
    ).toBeNull();
    expect(
      adminPathStatus({
        host: "intgetion.com",
        pathname: "/en/admin/users",
        hostOnly: true,
      }),
    ).toBe(404);
    expect(
      adminPathStatus({
        host: "intgetion.com",
        pathname: "/api/admin/users",
        hostOnly: true,
      }),
    ).toBe(404);
    expect(
      adminPathStatus({
        host: "intgetion.com",
        pathname: "/en/jobs",
        hostOnly: true,
      }),
    ).toBeNull();
  });

  it("sends the bare admin host to sign-in", () => {
    expect(adminHostEntry("/")).toBe("/admin/login");
    expect(adminHostEntry("/en")).toBeNull();
    expect(adminHostEntry("/en/jobs")).toBeNull();
  });

  it("serves only the admin surface on the admin host", () => {
    expect(
      adminPathStatus({
        host: "admin.localhost:3000",
        pathname: "/en/admin/login",
        hostOnly: false,
      }),
    ).toBeNull();
    expect(
      adminPathStatus({
        host: "admin.intgetion.com",
        pathname: "/robots.txt",
        hostOnly: false,
      }),
    ).toBeNull();
    expect(
      adminPathStatus({
        host: "admin.localhost:3000",
        pathname: "/en/jobs",
        hostOnly: false,
      }),
    ).toBe(404);
    expect(
      adminPathStatus({
        host: "admin.localhost:3000",
        pathname: "/en",
        hostOnly: false,
      }),
    ).toBe(404);
  });

  it("builds the origin the admin host will accept", () => {
    expect(hostOrigin("admin.localhost:3000")).toBe(
      "http://admin.localhost:3000",
    );
    expect(hostOrigin("admin.intgetion.com")).toBe(
      "https://admin.intgetion.com",
    );
  });

  it("lets a loopback port match its own origin", () => {
    expect(csrfSite("127.0.0.1:3100", "http://127.0.0.1:3000")).toBe(
      "http://127.0.0.1:3100",
    );
    expect(csrfSite("intgetion.com", "https://intgetion.com")).toBe(
      "https://intgetion.com",
    );
    expect(csrfSite("admin.localhost:3000", "https://intgetion.com")).toBe(
      "http://admin.localhost:3000",
    );
  });
});

describe("admin paths without a locale prefix (D335)", () => {
  it("treats /admin like /en/admin and /ru/admin", () => {
    for (const pathname of [
      "/admin",
      "/admin/users",
      "/ru/admin",
      "/en/admin",
    ]) {
      expect(isAdminSurface(pathname)).toBe(true);
    }
    expect(isAdminSurface("/administrators")).toBe(false);
    expect(isAdminSurface("/jobs")).toBe(false);
  });
});
