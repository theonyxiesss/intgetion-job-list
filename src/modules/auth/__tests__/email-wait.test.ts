import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
}));

vi.mock("../repo/auth-email-wait", () => ({
  insertAuthEmailWait: vi.fn(),
  deleteExpiredAuthEmailWaits: vi.fn(),
  markAuthEmailWaitReady: vi.fn(),
  consumeAuthEmailWait: vi.fn(),
  findAuthEmailWait: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  getAuthUserLoginEmail: vi.fn(),
  magicLinkTokenHash: vi.fn(),
}));

import { cookies } from "next/headers";
import * as admin from "@/lib/supabase/admin";
import * as waits from "../repo/auth-email-wait";
import {
  beginEmailWait,
  claimEmailWait,
  readyEmailWait,
} from "../service/email-wait";

const insert = vi.mocked(waits.insertAuthEmailWait);
const markReady = vi.mocked(waits.markAuthEmailWaitReady);
const consume = vi.mocked(waits.consumeAuthEmailWait);
const find = vi.mocked(waits.findAuthEmailWait);
const getEmail = vi.mocked(admin.getAuthUserLoginEmail);
const mint = vi.mocked(admin.magicLinkTokenHash);

describe("email wait (D328)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores a hashed wait token and sets the cookie", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set,
    } as never);
    const raw = await beginEmailWait("login", "en");
    expect(raw.length).toBeGreaterThan(20);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: "login",
        locale: "en",
        waitHash: createHash("sha256").update(raw).digest("hex"),
      }),
    );
    expect(set).toHaveBeenCalledWith(
      "auth_email_wait",
      raw,
      expect.objectContaining({ httpOnly: true }),
    );
  });

  it("marks the wait ready with a handoff token", async () => {
    getEmail.mockResolvedValue("a@example.com");
    mint.mockResolvedValue("handoff-hash");
    markReady.mockResolvedValue({
      purpose: "login",
    } as never);
    await expect(
      readyEmailWait("raw-wait", {
        authUid: "uid",
      } as never),
    ).resolves.toBe("login");
    expect(markReady).toHaveBeenCalledWith(
      createHash("sha256").update("raw-wait").digest("hex"),
      "handoff-hash",
      expect.any(Date),
    );
  });

  it("claims a ready wait on the PC browser", async () => {
    const set = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(() => ({ value: "raw-wait" })),
      set,
    } as never);
    find.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      readyAt: new Date(),
      handoffTokenHash: "h",
    } as never);
    consume.mockResolvedValue("h");
    const verifyOtp = vi.fn().mockResolvedValue({ error: null });
    await expect(claimEmailWait({ verifyOtp } as never)).resolves.toBe(
      "signed-in",
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "h",
      type: "magiclink",
    });
  });
});
