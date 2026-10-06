import { beforeEach, describe, expect, it, vi } from "vitest";

let loginEmail: string | null = "person@example.com";
let tokenHash: string | null = "hashed-token";
const asked: string[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  getAuthUserLoginEmail: (authUid: string) => {
    asked.push(authUid);
    return Promise.resolve(loginEmail);
  },
  magicLinkTokenHash: (email: string) => {
    asked.push(email);
    return Promise.resolve(tokenHash);
  },
}));

const { createSessionHandoff } = await import("../service/handoff");

const user = {
  id: "user-1",
  authUid: "auth-1",
} as Parameters<typeof createSessionHandoff>[0];

describe("handing the session to another browser (D316)", () => {
  beforeEach(() => {
    asked.length = 0;
    loginEmail = "person@example.com";
    tokenHash = "hashed-token";
    process.env.NEXT_PUBLIC_SITE_URL = "https://intgetion.com";
  });

  it("builds the ordinary magic-link callback for this account", async () => {
    const { url } = await createSessionHandoff(user, "ru");
    const parsed = new URL(url);
    expect(parsed.origin).toBe("https://intgetion.com");
    expect(parsed.pathname).toBe("/ru/auth/callback");
    expect(parsed.searchParams.get("token_hash")).toBe("hashed-token");
    expect(parsed.searchParams.get("type")).toBe("magiclink");
    // The token is minted for the caller's own login email, nobody else's.
    expect(asked).toEqual(["auth-1", "person@example.com"]);
  });

  it("refuses when the account has no login email", async () => {
    loginEmail = null;
    await expect(createSessionHandoff(user, "en")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("refuses when Supabase will not mint a link", async () => {
    tokenHash = null;
    await expect(createSessionHandoff(user, "en")).rejects.toMatchObject({
      status: 503,
    });
  });
});
