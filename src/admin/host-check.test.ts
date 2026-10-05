import { describe, expect, it } from "vitest";
import {
  checkAdminHost,
  publicOriginFor,
} from "../../scripts/check-admin-host.mjs";

function pages(map: Record<string, { status: number; body?: string }>) {
  return async (url: string) => {
    const hit = map[url];
    if (!hit) return new Response("missing", { status: 599 });
    return new Response(hit.body ?? "", { status: hit.status });
  };
}

const ready = {
  "https://admin.intgetion.com/en/admin/login": { status: 200 },
  "https://admin.intgetion.com/en/admin/mfa": { status: 200 },
  "https://admin.intgetion.com/en": { status: 404 },
  "https://admin.intgetion.com/en/jobs": { status: 404 },
  "https://admin.intgetion.com/robots.txt": {
    status: 200,
    body: "User-agent: *\nDisallow: /\n",
  },
  "https://intgetion.com/en/admin": { status: 404 },
  "https://intgetion.com/en/admin/login": { status: 404 },
};

describe("admin host check", () => {
  it("strips the admin prefix when no public origin is given", () => {
    expect(publicOriginFor("https://admin.intgetion.com")).toBe(
      "https://intgetion.com",
    );
    expect(
      publicOriginFor("http://admin.localhost:3000", "http://127.0.0.1:3001"),
    ).toBe("http://127.0.0.1:3001");
  });

  it("accepts login, MFA, a closed public admin, and robots", async () => {
    const result = await checkAdminHost(
      "https://admin.intgetion.com",
      "https://intgetion.com",
      pages(ready),
    );
    expect(result.ok).toBe(true);
  });

  it("fails when the public site still serves /admin", async () => {
    const result = await checkAdminHost(
      "https://admin.intgetion.com",
      "https://intgetion.com",
      pages({
        ...ready,
        "https://intgetion.com/en/admin": { status: 200 },
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.lines.find((line) => line.name.startsWith("public"))?.pass,
    ).toBe(false);
  });
});
