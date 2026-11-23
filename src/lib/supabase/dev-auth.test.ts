import { describe, expect, it } from "vitest";
import { devAuthUid, withDevAuth } from "./dev-auth";
import type { SupabaseClient } from "@supabase/supabase-js";

const UID = "d0d0d0d0-0000-4000-8000-000000000001";

describe("devAuthUid", () => {
  it("runs only in development with a valid uid", () => {
    expect(devAuthUid({ NODE_ENV: "development", DEV_AUTH_USER: UID })).toBe(
      UID,
    );
  });

  it("never runs in a production build", () => {
    expect(devAuthUid({ NODE_ENV: "production", DEV_AUTH_USER: UID })).toBe(
      null,
    );
  });

  it("never runs on Vercel, even in development", () => {
    expect(
      devAuthUid({ NODE_ENV: "development", VERCEL: "1", DEV_AUTH_USER: UID }),
    ).toBe(null);
    expect(
      devAuthUid({
        NODE_ENV: "development",
        VERCEL_ENV: "preview",
        DEV_AUTH_USER: UID,
      }),
    ).toBe(null);
  });

  it("is off without a uid or with a malformed one", () => {
    expect(devAuthUid({ NODE_ENV: "development" })).toBe(null);
    expect(
      devAuthUid({ NODE_ENV: "development", DEV_AUTH_USER: "admin" }),
    ).toBe(null);
  });

  it("is off in tests", () => {
    expect(devAuthUid({ NODE_ENV: "test", DEV_AUTH_USER: UID })).toBe(null);
  });
});

describe("withDevAuth", () => {
  it("answers getUser and getClaims with the dev user", async () => {
    const client = { auth: {} } as unknown as SupabaseClient;
    withDevAuth(client, UID);
    const { data: userData } = await client.auth.getUser();
    expect(userData.user?.id).toBe(UID);
    expect(userData.user?.email_confirmed_at).toBeTruthy();
    const { data: claims } = await client.auth.getClaims();
    expect(claims?.claims.sub).toBe(UID);
  });
});
