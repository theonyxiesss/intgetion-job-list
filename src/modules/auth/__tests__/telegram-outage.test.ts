import { beforeEach, describe, expect, it, vi } from "vitest";
import * as admin from "@/lib/supabase/admin";
import * as health from "@/lib/supabase/auth-health";
import * as telegramAccounts from "../repo/telegram-accounts";
import * as usersRepo from "../repo/users";
import {
  signInWithTelegramProfile,
  type AuthClient,
} from "../service/auth-service";

vi.mock("../repo/users", () => ({
  findUserById: vi.fn(),
  findUserByAuthUid: vi.fn(),
  insertUserIfMissing: vi.fn(),
}));
vi.mock("../repo/telegram-accounts", () => ({
  findByTelegramId: vi.fn(),
  link: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", async (importOriginal) => ({
  ...(await importOriginal<typeof admin>()),
  getAuthUserLoginEmail: vi.fn(),
  magicLinkTokenHash: vi.fn(),
  createConfirmedAuthUser: vi.fn(),
}));
vi.mock("@/lib/supabase/auth-health", async (importOriginal) => ({
  ...(await importOriginal<typeof health>()),
  checkAuthHealth: vi.fn(),
}));

const user = {
  id: "11111111-1111-4111-8111-111111111111",
  authUid: "22222222-2222-4222-8222-222222222222",
  status: "active",
};

function fakeAuth() {
  return {
    verifyOtp: vi.fn().mockResolvedValue({ data: {}, error: null }),
    getUser: vi.fn(),
    signOut: vi.fn(),
  } as unknown as AuthClient & { verifyOtp: ReturnType<typeof vi.fn> };
}

describe("Telegram sign-in finish when Supabase Auth is down (D606)", () => {
  beforeEach(() => {
    vi.mocked(telegramAccounts.findByTelegramId).mockResolvedValue({
      userId: user.id,
    } as never);
    vi.mocked(usersRepo.findUserById).mockResolvedValue(user as never);
    vi.mocked(admin.getAuthUserLoginEmail).mockResolvedValue("tg@example.com");
  });

  it("no session token + Auth health down → 503 AUTH_UNAVAILABLE", async () => {
    vi.mocked(admin.magicLinkTokenHash).mockResolvedValue(null);
    vi.mocked(health.checkAuthHealth).mockResolvedValue("down");
    await expect(
      signInWithTelegramProfile(fakeAuth(), { id: 42 }, "ru"),
    ).rejects.toMatchObject({ status: 503, code: "AUTH_UNAVAILABLE" });
  });

  it("no session token while Auth is up stays a provider error", async () => {
    vi.mocked(admin.magicLinkTokenHash).mockResolvedValue(null);
    vi.mocked(health.checkAuthHealth).mockResolvedValue("up");
    await expect(
      signInWithTelegramProfile(fakeAuth(), { id: 42 }, "ru"),
    ).rejects.toMatchObject({ status: 502, code: "AUTH_PROVIDER_ERROR" });
  });

  it("402 from verifyOtp is an outage, not a failed Telegram check", async () => {
    vi.mocked(admin.magicLinkTokenHash).mockResolvedValue("hash");
    const auth = fakeAuth();
    auth.verifyOtp.mockResolvedValue({ data: {}, error: { status: 402 } });
    await expect(
      signInWithTelegramProfile(auth, { id: 42 }, "ru"),
    ).rejects.toMatchObject({ status: 503, code: "AUTH_UNAVAILABLE" });
  });
});
